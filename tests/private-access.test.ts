// Access control for /private/: the auth module and both edge functions, run in Node
// (they only use web-standard APIs). Node strips the TypeScript types natively.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_NAME,
  createMagicKey,
  createSession,
  passwordMatches,
  readCookie,
  safeNext,
  verifyMagicKey,
  verifySession,
} from '../netlify/shared/auth.ts';
import privateGate from '../netlify/edge-functions/private-gate.ts';
import login from '../netlify/edge-functions/login.ts';

const SECRET = 'test-secret-only-for-unit-tests';
const PASSWORD = 'correct horse battery staple';
const DAY = 24 * 60 * 60 * 1000;

let env: Record<string, string | undefined>;
(globalThis as unknown as { Netlify: unknown }).Netlify = {
  env: { get: (name: string) => env[name] },
};
beforeEach(() => {
  env = { COOKIE_SECRET: SECRET, SITE_PASSWORD: PASSWORD };
});

/** Stand-in for Netlify's context: next() is what the CDN would have served. */
const context = {
  next: async () =>
    new Response('<h1>served</h1>', { headers: { 'Cache-Control': 'public, max-age=3600' } }),
} as unknown as Parameters<typeof privateGate>[1];

const request = (path: string, cookie?: string, init: RequestInit = {}) =>
  new Request(`https://asia.example${path}`, {
    ...init,
    headers: { ...(cookie ? { cookie: `${COOKIE_NAME}=${cookie}` } : {}), ...init.headers },
  });

const setCookieValue = (response: Response) =>
  response.headers.get('set-cookie')?.match(new RegExp(`${COOKIE_NAME}=([^;]*)`))?.[1];

describe('sessions', () => {
  test('a fresh session verifies and carries its label', async () => {
    assert.equal(await verifySession(SECRET, await createSession(SECRET, 'family')), 'family');
  });

  test('tampered, forged, expired or malformed sessions are rejected', async () => {
    const valid = await createSession(SECRET, 'family');
    const [expires, label, signature] = valid.split('.');
    const rejected = [
      `${expires}.friends.${signature}`, // label changed
      `${Number(expires) + DAY}.${label}.${signature}`, // expiry extended
      `${expires}.${label}.${signature.slice(0, -2)}AA`, // signature altered
      await createSession('another-secret', 'family'), // signed with another secret
      'garbage',
      '',
      null,
    ];
    for (const value of rejected)
      assert.equal(await verifySession(SECRET, value), null, String(value));
    // expired: 91 days later
    assert.equal(await verifySession(SECRET, valid, Date.now() + 91 * DAY), null);
  });

  test('rotating the secret invalidates existing sessions and magic links', async () => {
    const session = await createSession(SECRET, 'family');
    const key = await createMagicKey(SECRET, 'family');
    assert.equal(await verifySession('rotated-secret', session), null);
    assert.equal(await verifyMagicKey('rotated-secret', key), null);
  });
});

describe('magic links and password', () => {
  test('magic keys verify only for their own label', async () => {
    const key = await createMagicKey(SECRET, 'family');
    assert.equal(await verifyMagicKey(SECRET, key), 'family');
    assert.equal(await verifyMagicKey(SECRET, key.replace('family', 'friends')), null);
    assert.equal(await verifyMagicKey(SECRET, 'family'), null);
  });

  test('password comparison', async () => {
    assert.equal(await passwordMatches(PASSWORD, PASSWORD), true);
    assert.equal(await passwordMatches('wrong', PASSWORD), false);
    assert.equal(await passwordMatches('', PASSWORD), false);
    assert.equal(await passwordMatches('', ''), false); // no password configured
  });

  test('redirect targets stay inside /private/', () => {
    assert.equal(safeNext('/private/japan/'), '/private/japan/');
    for (const bad of ['https://evil.example/', '//evil.example/', '/japan/', '/\\evil', null]) {
      assert.equal(safeNext(bad), '/private/', String(bad));
    }
  });

  test('cookies are read by exact name', () => {
    const req = new Request('https://x', { headers: { cookie: `a=1; ${COOKIE_NAME}=v.a.l; b=2` } });
    assert.equal(readCookie(req), 'v.a.l');
  });
});

describe('private gate (edge function)', () => {
  const blocked = async (cookie?: string) => {
    const response = await privateGate(request('/private/japan/?x=1', cookie), context);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login/?next=%2Fprivate%2Fjapan%2F%3Fx%3D1');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  };

  test('no cookie → redirect to login', () => blocked());
  test('forged cookie → redirect to login', () => blocked('9999999999999.family.AAAA'));
  test('expired cookie → redirect to login', async () => {
    await blocked(await createSession(SECRET, 'family', Date.now() - 91 * DAY));
  });
  test('cookie from another secret → redirect to login', async () => {
    await blocked(await createSession('another-secret', 'family'));
  });
  test('no COOKIE_SECRET configured → nobody gets in (fail closed)', async () => {
    const cookie = await createSession(SECRET, 'family');
    env.COOKIE_SECRET = undefined;
    await blocked(cookie);
  });

  test('valid cookie → page served, never cached or indexed', async () => {
    const response = await privateGate(
      request('/private/japan/', await createSession(SECRET, 'family')),
      context,
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<h1>served</h1>');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  });
});

describe('login (edge function)', () => {
  const post = (password: string, next = '/private/greece/') =>
    login(
      request('/login/', undefined, {
        method: 'POST',
        body: new URLSearchParams({ password, next }),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
      context,
    );

  test('right password → session cookie and back to where you were going', async () => {
    const response = await post(PASSWORD);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/private/greece/');
    const cookie = setCookieValue(response);
    assert.equal(await verifySession(SECRET, cookie), 'password');
    const header = response.headers.get('set-cookie') ?? '';
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'])
      assert.ok(header.includes(flag), flag);
  });

  test('wrong password → no cookie, back to the form (after a delay)', async () => {
    const started = Date.now();
    const response = await post('nope');
    assert.ok(Date.now() - started >= 700, 'failure is slowed down');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(
      response.headers.get('location'),
      '/login/?error=password&next=%2Fprivate%2Fgreece%2F',
    );
  });

  test('open redirect attempts land on /private/', async () => {
    const response = await post(PASSWORD, 'https://evil.example/');
    assert.equal(response.headers.get('location'), '/private/');
  });

  test('valid magic link → session for that label', async () => {
    const key = await createMagicKey(SECRET, 'family');
    const response = await login(request(`/login/?key=${encodeURIComponent(key)}`), context);
    assert.equal(response.headers.get('location'), '/private/');
    assert.equal(await verifySession(SECRET, setCookieValue(response)), 'family');
  });

  test('invalid magic link → no cookie', async () => {
    const response = await login(request('/login/?key=family.forged'), context);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('location'), '/login/?error=link');
  });

  test('logout clears the cookie', async () => {
    const response = await login(request('/logout/'), context);
    assert.match(
      response.headers.get('set-cookie') ?? '',
      new RegExp(`${COOKIE_NAME}=;.*Max-Age=0`),
    );
    assert.equal(response.headers.get('location'), '/');
  });

  test('plain GET serves the login page without caching', async () => {
    const response = await login(request('/login/'), context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
});

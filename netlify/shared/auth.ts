/**
 * Signed-cookie access for /private/. Web Crypto only (runs in Netlify's edge runtime and in
 * Node for tests). Nothing is stored server-side: a session is "expiry.label.signature", an
 * HMAC-SHA256 over "expiry.label" with COOKIE_SECRET. Rotating that secret logs everyone out
 * and invalidates every magic link.
 */

export const COOKIE_NAME = '__Host-travel';
export const SESSION_DAYS = 90;
const LABEL = /^[a-z0-9-]{1,32}$/;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(secret: string, data: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(data));
  return toBase64Url(signature);
}

/** Constant-time check (crypto.subtle.verify). */
async function verify(secret: string, data: string, signature: string): Promise<boolean> {
  const bytes = fromBase64Url(signature);
  if (!bytes) return false;
  return crypto.subtle.verify('HMAC', await hmacKey(secret), bytes, encoder.encode(data));
}

export async function createSession(secret: string, label: string, now = Date.now()) {
  if (!LABEL.test(label)) throw new Error(`Invalid label: ${label}`);
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${expires}.${label}`;
  return `${payload}.${await sign(secret, payload)}`;
}

/** The session's label ("password", "family", …) or null when missing, forged or expired. */
export async function verifySession(
  secret: string,
  value: string | null | undefined,
  now = Date.now(),
): Promise<string | null> {
  const parts = value?.split('.');
  if (!parts || parts.length !== 3) return null;
  const [expires, label, signature] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) <= now || !LABEL.test(label)) return null;
  return (await verify(secret, `${expires}.${label}`, signature)) ? label : null;
}

/** Magic link key for /login/?key=… : "label.signature", valid until the secret is rotated. */
export async function createMagicKey(secret: string, label: string) {
  if (!LABEL.test(label)) throw new Error(`Invalid label: ${label}`);
  return `${label}.${await sign(secret, `magic:${label}`)}`;
}

export async function verifyMagicKey(secret: string, key: string | null): Promise<string | null> {
  const [label, signature, ...rest] = key?.split('.') ?? [];
  if (!label || !signature || rest.length || !LABEL.test(label)) return null;
  return (await verify(secret, `magic:${label}`, signature)) ? label : null;
}

/** Constant-time password comparison: compare HMACs of both values under a per-call random key. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const expectedMac = await sign(nonce, expected);
  return verify(nonce, input, expectedMac);
}

export function readCookie(request: Request, name = COOKIE_NAME): string | null {
  for (const part of request.headers.get('cookie')?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

export function sessionCookie(value: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearedCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/** Only ever redirect back into the private area after login (no open redirects). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/private/') || next.startsWith('//') || next.includes('\\')) {
    return '/private/';
  }
  return next;
}

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

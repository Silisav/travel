/**
 * /login/  GET            → the static login page
 *          GET ?key=…     → magic link: sign in and go to /private/
 *          POST password  → shared password: sign in and go back to where you were headed
 * /logout/                → sign out
 */
import type { Config, Context } from '@netlify/edge-functions';
import {
  PRIVATE_HEADERS,
  clearedCookie,
  createSession,
  passwordMatches,
  safeNext,
  sessionCookie,
  verifyMagicKey,
} from '../shared/auth.ts';

/** Small fixed delay on failures, to make password guessing slow. */
export const FAILURE_DELAY_MS = 800;

const redirect = (location: string, cookie?: string) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: location,
      ...PRIVATE_HEADERS,
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });

export default async function login(request: Request, context: Context) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/logout')) return redirect('/', clearedCookie());

  const secret = Netlify.env.get('COOKIE_SECRET');
  const password = Netlify.env.get('SITE_PASSWORD');

  if (request.method === 'POST') {
    const form = await request.formData();
    const next = safeNext(String(form.get('next') ?? ''));
    if (
      secret &&
      password &&
      (await passwordMatches(String(form.get('password') ?? ''), password))
    ) {
      return redirect(next, sessionCookie(await createSession(secret, 'password')));
    }
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return redirect(`/login/?error=password&next=${encodeURIComponent(next)}`);
  }

  const key = url.searchParams.get('key');
  if (key !== null) {
    const label = secret ? await verifyMagicKey(secret, key) : null;
    if (label) return redirect('/private/', sessionCookie(await createSession(secret!, label)));
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return redirect('/login/?error=link');
  }

  // Plain GET: serve the static login page, never cached or indexed.
  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}

export const config: Config = { path: ['/login', '/login/', '/logout', '/logout/'] };

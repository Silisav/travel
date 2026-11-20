/**
 * Gate for everything under /private/ (pages, photos, video). Runs on every request, before
 * Netlify's cache. No valid session cookie → redirect to /login/. Fails closed: without
 * COOKIE_SECRET nobody gets in.
 */
import type { Config, Context } from '@netlify/edge-functions';
import { PRIVATE_HEADERS, readCookie, verifySession } from '../shared/auth.ts';

export default async function privateGate(request: Request, context: Context) {
  const secret = Netlify.env.get('COOKIE_SECRET');
  const url = new URL(request.url);
  const session = secret ? await verifySession(secret, readCookie(request)) : null;

  if (!session) {
    const next = encodeURIComponent(url.pathname + url.search);
    return new Response(null, {
      status: 302,
      headers: { Location: `/login/?next=${next}`, ...PRIVATE_HEADERS },
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}

export const config: Config = { path: ['/private', '/private/*'] };

/**
 * Print a one-tap sign-in link for the private area.
 *
 *   COOKIE_SECRET=… node scripts/make-magic-link.ts family
 *
 * Use the same COOKIE_SECRET as on Netlify (never commit it). The label ("family",
 * "friends", …) is only for you: it's stored in the session so you know which link was used.
 * Rotating COOKIE_SECRET on Netlify invalidates every link and logs everyone out.
 */
import { createMagicKey } from '../netlify/shared/auth.ts';

const [label = 'family', origin = 'https://asia.vasilis-tsirimokos.com'] = process.argv.slice(2);
const secret = process.env.COOKIE_SECRET;

if (!secret) {
  console.error('Set COOKIE_SECRET (the same value as on Netlify).');
  process.exit(1);
}

const key = await createMagicKey(secret, label);
console.log(`${origin}/login/?key=${encodeURIComponent(key)}`);

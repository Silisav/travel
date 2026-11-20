// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import privateMedia from './integrations/private-media.mjs';

export default defineConfig({
  site: 'https://asia.vasilis-tsirimokos.com',
  // Clean, directory-style URLs: /japan/ (old /japan.html URLs 301 via public/_redirects)
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [privateMedia()],

  // Self-hosted at build time, with metric-matched fallbacks (no layout shift).
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'vietnamese'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Libre Baskerville',
      cssVariable: '--font-baskerville',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Georgia', 'serif'],
    },
  ],
});

// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://asia.vasilis-tsirimokos.com',
  // Clean, directory-style URLs: /japan/ (old /japan.html URLs 301 via public/_redirects)
  trailingSlash: 'always',
  build: { format: 'directory' },
});

# AGENTS.md

Photo journal of a 2016 trip around Asia, live at https://asia.vasilis-tsirimokos.com.
Static site built with Astro, hosted on Netlify. The full rebuild plan is in `PLAN.md`.

## Commands

- `npm run dev`: local dev server
- `npm run build`: static build to `dist/`
- `npm test`: privacy and access tests (needs a build first)
- `npm run test:e2e`: Playwright browser tests (Chromium + WebKit) against the build: every page, menu, photo viewer, map, accessibility (axe), no-JS
- `npm run verify`: everything CI runs: type check, lint, format check, build, test

Use the Node version in `.nvmrc` (24 LTS).

## Non-negotiables

1. **Privacy.** This repo is public.
   - Never commit photos or video showing people, or captions about them. Personal media and its metadata live only in the private submodule at `media/private/`.
   - Public pages are built from public data only and must never reference `/private/`.
   - The build must still succeed without the submodule. It then produces the public site only (fail closed).
   - `tests/no-private-leak.test.mjs` enforces this. Never weaken or skip it.
2. **Native first.** Use HTML, CSS and web platform APIs (see Chrome's Modern Web Guidance).
   - A new runtime (browser-shipped) dependency needs a clear UX justification in `PLAN.md`.
   - Current runtime libraries: PhotoSwipe (pinch-zoom lightbox) and Leaflet (map), both loaded on demand with dynamic `import()`.
   - Build-time tools are fine.
3. **Baseline widely available.** Newer features go behind `@supports` or feature detection as progressive enhancement. ESLint's `css/use-baseline` rule checks `.css` files, so put styles in `src/styles/*.css` rather than large `<style>` blocks.
4. **Works without JS**, except the map, the live clock and lightbox gestures.
5. **Accessibility.** Use semantic elements and real `<button>`s, respect `prefers-reduced-motion`, write meaningful alt text, and never block pinch-zoom.

## Layout

- `src/pages/`: routes, with clean URLs (`/japan/`). `src/pages/private/[...path].astro` mirrors every page under `/private/`, and is only built when the submodule exists.
- `src/views/`: the page templates (Home, Country, Map), shared by public and private routes. Links must use `basePath(Astro.url)` from `src/lib/site.ts` so private pages link to private pages. A test enforces this.
- `src/lib/`: `site.ts` (countries, base path, date formatting) and `private-media.ts` (private photos and video, empty without the submodule)
- `integrations/private-media.mjs`: serves and copies private media to `/private/media/`
- `netlify/edge-functions/`: `private-gate.ts` (every `/private/*` request needs a valid signed cookie, otherwise a redirect to `/login/`) and `login.ts` (password form, magic links, logout). Shared logic lives in `netlify/shared/auth.ts` and is covered by `tests/private-access.test.ts`. They need `SITE_PASSWORD` and `COOKIE_SECRET` (see `.env.example`).
- Magic links: `COOKIE_SECRET=… npm run magic-link -- family`
- `src/layouts/`, `src/components/`: Astro components
- `src/styles/`: `tokens.css` (design tokens), `base.css`, component CSS
- `public/`: copied as-is. Includes `_redirects` (old `*.html` → new URLs) and `robots.txt`.
- `src/data/countries.json`: all country content and public photos, validated by the schema in `src/content.config.ts`
- `src/data/trip.ts`: trip-wide facts (dates, home city)
- `media/public/`: public originals (landscapes only), processed by `astro:assets`
- `media/private/`: **git submodule** (private repo `travel-private`) with personal photos, the video and `private.json`. Private photos must **never** go through `image()`/`astro:assets`, because those emit to the public `/_astro/` folder. They are plain paths, processed into `dist/private/` by our own script.
- `tests/`: `node:test` suites (no test framework)
- `legacy/`: the original 2016 site, kept only as a reference while porting. Do not edit; it gets deleted at the end of the rebuild.

## Adding content

**Photos are just files.** Drop them into a country folder and they appear on that country's page. Nothing else is required:

- **Public** (landscapes, no people): `media/public/photos/<country>/`
- **Personal**: `photos/<country>/` in the private repo (`media/private/`)

Country folders: `japan`, `vietnam`, `cambodia`, `thailand`, `malaysia`, `indonesia`, `greece`. File names don't matter.

- **Formats:** JPEG, PNG, WebP, AVIF, TIFF or GIF. HEIC and RAW files stop the build with a message to export them as JPEG first. Around 2,400–3,000 px on the long side is plenty.
- **Order:** by date taken (camera data), then by file name. Photos without a date come after dated ones.
- **Description:** "Photo from <Country>" and no caption, until you add extras.
- **Optional extras**, to describe or reorder a photo:
  - Public, in `src/data/countries.json` under the country's `photos`: `{ "file": "IMG_1234.jpg", "alt": "…", "caption": "…", "order": 1 }`. `cover` (a file name) picks the photo used in the homepage slideshow.
  - Personal, in the private repo's `private.json` under `photos`: `{ "file": "japan/IMG_1234.jpg", "alt": "…", "caption": "…", "order": 1 }`.
  - Lower `order` comes first; everything without one follows by date. An extra naming a file that doesn't exist stops the build (typo guard).
- **After adding personal photos:** push the private repo, then update the submodule pointer in this repo (`git add media/private` + commit + push), or Netlify keeps building the previous set.

The logic lives in `integrations/photos.mjs` (shared), `src/lib/photos.ts` (public) and `integrations/private-images.mjs` (private).

## Conventions

- Prettier formats everything (`npm run format`); ESLint must pass.
- Keep commits focused. Run `npm run verify` before pushing.

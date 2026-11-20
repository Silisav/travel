# AGENTS.md

Photo journal of a 2016 trip around Asia, live at https://asia.vasilis-tsirimokos.com.
Static site built with Astro, hosted on Netlify. The full rebuild plan is in `PLAN.md`.

## Commands

- `npm run dev`: local dev server
- `npm run build`: static build to `dist/`
- `npm test`: privacy and regression tests (needs a build first)
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

- `src/pages/`: routes, with clean URLs (`/japan/`)
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

- **Public photo:** drop the original in `media/public/photos/<country>/`, then add `{ "src", "alt" }` to that country in `countries.json`. Landscapes only: no recognisable faces of the site owners.
- **Personal photo:** add it in the private repo (see its README), never here.

## Conventions

- Prettier formats everything (`npm run format`); ESLint must pass.
- Keep commits focused. Run `npm run verify` before pushing.

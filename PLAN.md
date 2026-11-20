# Rebuild plan: Asia travel photo journal

## Where things stand (Nov 2026)

- **Stack:** 2016-era Grunt + node-sass + Bootstrap 3, jQuery 1.12, Masonry, PhotoSwipe v4 (from the dead rawgit CDN), moment + moment-timezone, Leaflet, grunticon, Modernizr.
- **Content:** 9 hand-written HTML pages. The 7 country pages are near-identical copies of about 300 lines each.
- **Assets:** about 37 MB of images and a **55 MB** `daily.mp4`, all in a **public** GitHub repo (`Silisav/travel`).
- **Broken on the live site:**
  - Country clocks throw `moment(...).tz is not a function`.
  - Map tiles are blank because Stamen moved to Stadia.
  - The "Day 3875" counter keeps counting.
  - Grunt and node-sass don't install on current Node.

## Guiding principles

1. **Native first.** Use HTML, CSS and web platform APIs following [Chrome's Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started). Target **Baseline Widely available**, with newer features (Newly available or not yet Baseline) as progressive enhancement behind `@supports` or feature detection.
2. **A third-party library ships to the browser only if it's irreplaceable and clearly improves UX.** Currently that's two libraries, each loaded on demand with dynamic `import()`:
   - **PhotoSwipe v5**, for pinch-zoom on single high-res photos, which the platform can't do per element. It loads on the first photo tap.
   - **Leaflet**, for a slippy map. It loads on `/map/` only.

   Build-time tools (Astro, sharp) ship nothing to the browser.
3. **No JS framework runtime.** Small vanilla `<script type="module">` enhancements only. Every page works with JS off, apart from the map, the clock and lightbox swiping.
4. **Privacy by construction.** The public build can't contain a face because private files are never inputs to it (see below).

## Stack

| Concern | Old | New (native unless noted) |
|---|---|---|
| Generator | Grunt + copy-pasted HTML | **Astro** (build-time only, static output, 0 KB JS by default). Country pages come from one template + data file. |
| Layout/styling | Bootstrap 3 Sass | Plain CSS: custom properties, grid, native nesting, `clamp()`, container queries, `:has()`, `@layer` |
| Gallery masonry | Masonry.js + imagesLoaded + jQuery | CSS multi-column; `display: grid-lanes` (CSS masonry) behind `@supports` |
| Lightbox | PhotoSwipe v4 via dead CDN | **PhotoSwipe v5** (npm, ESM, about 15–20 KB gzipped) for pinch-zoom, double-tap zoom, pan and swipe-down to close. Lazy-imported on the first tap. Each thumbnail is a plain `<a href="full.jpg">`, so with no JS a tap opens the full image and the browser's own zoom works. |
| Side nav | jQuery class toggle + `transitionend` | `<dialog>` drawer (Modern Web Guidance navigation-drawer pattern): scroll-snap swipe-to-close, scroll-driven backdrop fade. Native focus handling and Esc to close. |
| Page transitions | none | **Cross-document View Transitions** (`@view-transition { navigation: auto }`). The country card's banner morphs into the country hero. Wrapped in `prefers-reduced-motion`. |
| "View photos" scroll | jQuery animate | `<a href="#photos">` + `scroll-behavior: smooth` |
| Reveal/parallax effects | none / JS | **Scroll-driven animations** (`animation-timeline: view()`), progressive enhancement only |
| Local clock | moment-timezone | `Intl.DateTimeFormat({ timeZone, timeStyle: 'short' })`, updated once a minute |
| "Today it's …" | custom `formatAMPM()` | `Intl.DateTimeFormat` |
| Images | imagemin + committed thumbs + hard-coded `data-size` | **sharp** at build: AVIF/WebP/JPEG `<picture>` with `srcset`/`sizes`, explicit `width`/`height`, `loading="lazy"` below the fold, `fetchpriority="high"` on the hero only, EXIF/GPS stripped. `content-visibility: auto` on the gallery. |
| Video | 55 MB MP4 | Re-encoded (AV1 + H.264 fallback, about 4–6 MB), `preload="none"`, poster, `<track>` captions optional |
| Icons | grunticon data-URI CSS | Inline SVG |
| Fonts | Google Fonts | Self-hosted WOFF2 subset (Montserrat variable, Libre Baskerville), `font-display: swap`, `size-adjust` fallback |
| Map | Leaflet + Stamen tiles | **Leaflet** (there is no native slippy-map API), lazy-loaded with `import()`. Uses keyless OpenStreetMap tiles with a pastel tint applied in **CSS `filter`** on the tile layer (see below). Watercolor comes later as a one-line tile-URL swap. Static fallback list of countries. |
| Hosting | ? | **Netlify** + Edge Functions for the private area |

### Map tiles

**For now: pastel without any key or signup.**
- Tiles: standard OpenStreetMap `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Keyless, and fine for a low-traffic personal site under the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) with visible attribution.
- Pastel look via CSS on the tile layer only, so the route and markers keep full colour. For example: `.leaflet-tile-pane { filter: saturate(.45) sepia(.2) brightness(1.06) contrast(.9) }`. We tune the values against the site's slate/gold palette during the build.
- The route is drawn in the site's gold as a dashed line, with markers styled as site-coloured dots linking to each country.
- CARTO Voyager/Positron would look pastel out of the box, but [CARTO basemaps now need a free API key](https://carto.com/basemaps/) outside their platform, so they're out for now.

**Later: watercolor.** Swap the tile URL to [Stamen Watercolor on Stadia Maps](https://docs.stadiamaps.com/map-styles/stamen-watercolor/) (`https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg`) and drop the CSS filter. It needs a free Stadia account with domain auth, so no key goes in the code. [Non-commercial use is fine](https://docs.stadiamaps.com/guides/migrating-from-stamen-map-tiles/).

The country pages' small map stays a static image (the current JPGs), so there's no Leaflet on country pages.

### Lightbox decision

Pinch-zoom on high-res photos on small screens is a must. The platform has no per-element pinch-zoom: a native `<dialog>` lightbox only gets whole-page zoom, which fights with the swipe. So **PhotoSwipe v5** is justified. It is the one place a library clearly beats the native version, and it costs nothing until the first tap.

## Public / private site

**Goal:** the same site and design. Public visitors see landscapes only, with no faces in any photo or video. A signed-in visitor (you, family, friends) sees the extra personal photos and the homepage video.

### Content model

Each photo in `src/data/trip.ts` gets a visibility flag:

```ts
{ file: 'japan/07.jpg', alt: 'Bamboo grove in Arashiyama', private: false }
{ file: 'japan/11.jpg', alt: 'Us at Fushimi Inari',        private: true  }
```

The homepage video is `private: true`. Banners, flags and maps must be public-safe; I'll audit the banners too.

### Storage: public code repo + private media repo (decided)

`Silisav/travel` stays **public**, with its full history since 2016, as a portfolio piece. Today's photos are all landscapes, so nothing personal is in it now.
- New private repo, e.g. `Silisav/travel-private`, mounted as a **git submodule** at `media/private/`. It holds:
  - the personal photo originals
  - the video
  - `private.json`: the list of private photos with their alt text and captions, so even file names and captions stay out of the public repo.
- Public visitors to GitHub see only that a submodule exists (name + commit hash). They can't open it.
- Netlify fetches the submodule with a read-only **deploy key**, set up in the Netlify UI and GitHub.
- **Fails closed:** if the submodule isn't there (a fork, a clone without access, a deploy preview), the build produces the public site only and skips `/private/`.
- Public landscape photos stay in the public repo under `media/public/` as today.

### Build output

```
dist/
  index.html, japan/, …, map/        ← public pages, built only from public photos
  img/…                              ← public image variants only
  private/                           ← same templates rendered with all photos + video
    index.html, japan/, …
    img/…, video/…
  login/index.html
```

- The public pages are built from a filtered data set. The private images are written only under `/private/`, so a public page can't reference them by accident.
- A build-time **check** fails the deploy if any public HTML/CSS references `/private/`, or if any public image's source is flagged private.

### Access control (Netlify Edge Function, no paid plan needed)

- An edge function on `/private/*` checks an **HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie** (secret in a Netlify env var).
  - **No valid cookie:** redirect to `/login/?next=…`.
  - **Valid cookie:** serve the page with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- `/login/` is a plain HTML `<form method="post">` handled by an edge function. It compares a shared password (env var), sets a cookie for about 90 days, and redirects. No JS needed.
- An optional **magic link** `/login/?key=…` lets family sign in in one tap. It can be revoked by rotating the secret.
- A signed-in visitor sees a small "Private view" badge and a link to log out or switch to the public view.
- Private pages are kept out of `sitemap.xml` and get `Disallow: /private/` in robots.txt.
- Netlify's own password protection is a Pro-plan feature and applies site-wide, so it doesn't fit this setup.

### How leak-proof is it? (threat model)

It isn't bulletproof the way end-to-end encryption is. It is solid for "I don't want my travel memories public", about the level of a password-protected photo album. Path by path:

| Leak path | Covered? | How |
|---|---|---|
| Public GitHub repo | Yes | Private originals, video, file names and captions live only in the private submodule |
| Public pages linking to private files | Yes | Public pages are built from public data only. A build check fails the deploy if any public file mentions `/private/`. |
| Guessing a private URL | Yes | Every private file (HTML, image variants, video) lives under `/private/`, and the edge function guards the whole prefix. Without a valid signed cookie: redirect to login. |
| **Netlify CDN cache** | Yes | On Netlify, [edge functions run *before* the cache layer](https://docs.netlify.com/start/core-concepts/request-chain/), on every request, including cached static files. Private responses also send `Cache-Control: private, no-store`, so nothing private is stored at shared CDN nodes. Different HTML per cookie on the same URL is avoided, which is why we use the `/private/` prefix. |
| Netlify Image CDN (`/.netlify/images?url=/private/…`) | Yes | We don't use it: variants are pre-built with sharp. The edge function also blocks any `/.netlify/images` request that points at `/private/`. |
| Old deploy permalinks / branch deploys | Yes | Same edge function and same gate in every deploy |
| Pull requests from forks stealing the deploy key | Yes | Netlify [now requires approval for fork deploy previews on public repos](https://www.netlify.com/changelog/2026-11-16-untrusted-deploys-policy/). In addition, the deploy key / submodule access is scoped to the **production** context only. |
| Netlify build logs | Yes | Build logs set to private. The build never prints private file names. |
| Password guessing | Mostly | Long random password + magic link. The login edge function adds a small delay. |
| Someone with access re-sharing | No | A friend could forward the magic link or screenshot photos. That's a social problem, not a technical one. Mitigation: rotating the secret logs everyone out. |
| Search engines | Yes | Private pages are never linked publicly, return `noindex`, and robots.txt disallows them |
| A bug in our gate code | Tested | QA phase includes an automated leak test: request every private path without a cookie, with a forged cookie and with an expired cookie, and expect a redirect every time |

### Why `/private/…` URLs instead of the same URL

Serving different HTML at `/japan/` depending on a cookie is possible (edge rewrite + `Netlify-Vary: cookie=…`). But it risks a CDN cache serving private HTML to a public visitor. A separate prefix makes that kind of leak impossible by construction. The visual experience is identical.

### Face audit

All current photos are landscapes and stay public. The new personal photos you add go straight into the private repo, so no auditing is needed for existing content.

### The video

- `daily.mp4` **shows faces**, so it moves to the private repo. It's re-encoded there and played only on `/private/`.
- **Git history:** removing the file from the working tree stops it being served or downloaded from now on, but it stays reachable in old commits on GitHub. Purging it means a history rewrite (`git filter-repo --path src/videos/daily.mp4 --invert-paths` + force-push):
  - It **keeps every commit, message and date**, so the 2016→today story survives. Only the commit hashes change.
  - Existing clones and forks keep the old copy, and GitHub may need a support request to drop cached views.
  - **Your call; not done without an explicit yes.**
- **Public homepage, for now:** a placeholder video. It's generated at build time by `scripts/make-placeholder-video.mjs` (ffmpeg): about 15 s of slow crossfades over the 7 public country banners, muted, a few hundred KB, with a poster. That doubles as a prototype of the "landscapes-only video" idea.
- **Video is optional in the data** (`home.video?: {...}`). If it's absent, the homepage video section collapses to a full-width text block, with the layout handled by `:has()` and no JS. Removing the video later is a one-line data change.

### Login

One shared password (Netlify env var `SITE_PASSWORD`) + **magic links**:
- Format: `/login/?key=<token>`, where the token is an HMAC of a label, e.g. "family".
- `scripts/make-magic-link.mjs family` prints a link to share.
- Rotating `COOKIE_SECRET` revokes every cookie and link at once.

## Design: keep, with these fixes

Keep: dark slate header, gold accent, Montserrat/Libre Baskerville, the home hero with stats, the alternating destination timeline, the country hero + Country info + Photostream, the grey/white stripes with the arrow notch.

Fixes:
1. Remove `user-scalable=no`, so pinch-zoom works.
2. Remove the preloader.
3. "Day 3875" becomes a fixed "130 days".
4. Reword "Today it's … and we're back in Europe" (keep it as a nostalgic line, or drop it).
5. Fix typos ("Curreny").
6. ~~Add prev/next country links~~: tried and removed. It isn't in the 2016 design and didn't look right. Revisit only with a proper design.
7. Write real alt text per photo.
8. Accessibility: real `<button>`s, contrast on the gold, `prefers-reduced-motion`.
9. Per-page title/description/Open Graph image, `sitemap.xml`.
10. Optional: `prefers-color-scheme` dark variant.

## URLs

Clean URLs (`/japan/`, `/map/`) with Netlify 301s in `_redirects`: `/japan.html /japan/ 301`, etc.

## Project structure

```
src/
  data/trip.ts                 # countries + photos (with private flag)
  components/                  # Header, NavDrawer, Hero, Stripe, Timeline, CountryInfo,
                               # Gallery, Lightbox, LocalClock, Footer
  layouts/Base.astro
  pages/[...visibility]/index.astro, [...visibility]/[country]/index.astro, map/index.astro, login/
  scripts/lightbox.js, clock.js, map.js     # tiny modules
  styles/tokens.css, base.css, components/*.css
media/                         # gitignored; public originals live in repo under media/public,
                               # private originals cloned from the private media repo at build
netlify/edge-functions/private-gate.ts, login.ts
scripts/build-images.mjs, check-no-private-leak.mjs
netlify.toml, public/_redirects, public/robots.txt
```

## Phases

1. **Scaffold** on a `rebuild` branch: Astro, Node 24 LTS, Prettier, ESLint (`@eslint/css` use-baseline), AGENTS.md + CLAUDE.md, CI workflow, Dependabot config. Remove Grunt, Bootstrap and node-sass.
2. **Data and private repo:** scrape the current pages into `trip.ts` (all public). Create `travel-private` and add it as a submodule at `media/private/`. Move the video there. You add your personal photos plus `private.json`.
3. **Design tokens and layout:** port colors, fonts and spacing from the SCSS. Build the header and nav drawer.
4. **Pages:** home, `[country]`, map, login, all rendered for both visibility levels.
5. **Native enhancements:** lightbox, view transitions, scroll-driven effects, clock, map with Stadia domain auth.
6. **Private gate:** edge functions, cookie signing, leak check in the build, Netlify env vars.
7. **Media:** sharp pipeline, video re-encode.
8. **QA:** compare against the old site at 375/768/1280 widths, Lighthouse ≥ 95 everywhere, axe, a test with JS disabled, and a leak test (curl every public URL and asset to confirm no private file is reachable without the cookie).
9. **Deploy:** Netlify site, DNS for `asia.vasilis-tsirimokos.com`, Stadia domain registration, `_redirects`. Decide on cleaning the old repo history.

## Tests

The goal is a small suite that guards what actually matters here: **privacy**, plus "nothing broke after a dependency bump". There's no unit-test sprawl for markup.

| Layer | Tool | What it checks |
|---|---|---|
| Types | `astro check` (TypeScript) | Components, data file |
| Data | Astro content-collection schema (zod, bundled with Astro) | Every photo file exists. Dates are valid. Time zones are valid (`Intl` throws on bad ones). Alt text is present. |
| **Leak check (build)** | `scripts/check-no-private-leak.mjs`, run with `node --test` | No public file in `dist/` mentions `/private/` or any private file name. A public-only build (no submodule) succeeds. |
| **Auth unit** | `node:test` (built-in, no Vitest) | Cookie sign/verify with Web Crypto: valid, tampered, expired. Magic-link token check. |
| **Leak check (live)** | Playwright against `netlify serve` locally and against the deploy preview | Every `/private/**` URL, plus `/.netlify/images?url=/private/…`, redirects to login with no cookie, a forged cookie or an expired cookie. After login it returns 200 with `Cache-Control: private, no-store`. |
| Smoke E2E | Playwright (Chromium + WebKit) | Each page renders with no console errors. Nav drawer opens and closes. PhotoSwipe opens, swipes and closes. The map loads. Old `.html` URLs return 301. |
| Accessibility | `@axe-core/playwright` within the smoke run | No serious or critical violations |
| Performance | Netlify Lighthouse plugin on deploy previews (optional) | Score ≥ 95 guard |

Playwright is the only real test dependency. It is dev-only and ships nothing to the browser.

## Tooling and keeping it up to date

- **Node 24 LTS**, pinned via `.nvmrc` + `engines`. **pnpm** (or npm; either is fine) with a committed lockfile.
- **Formatting/linting:**
  - Prettier (+ `prettier-plugin-astro`).
  - ESLint flat config with **`@eslint/css` and its `use-baseline` rule**. It flags CSS that isn't Baseline-widely-available unless it's inside `@supports`, which enforces the native-first principle automatically.
- **CI (GitHub Actions, free on public repos):** on every PR, run install, `astro check`, lint, build (public-only, no secrets), `node --test` and Playwright. Netlify builds the deploy preview, and the live leak test runs against it.
- **Dependabot** (built into GitHub, nothing to install):
  - Ecosystems: `npm` + `github-actions`.
  - **Monthly**, with **one grouped PR** for minor/patch updates and separate PRs for majors.
  - Optional: auto-merge grouped minor/patch PRs when CI is green.
  - With about 6 dependencies this stays quiet. Renovate is more powerful, but not needed at this size.
- **Security:** enable GitHub's Dependabot security alerts and secret scanning. Both are free on public repos and catch an accidentally committed token.

## AGENTS.md / CLAUDE.md

**Yes.** Both are short and high-value here because the privacy rules are easy for a future contributor (or AI agent) to break.
- `AGENTS.md`: the cross-tool standard, read by most coding agents. It covers:
  - commands (dev, build, test)
  - project structure
  - **non-negotiables:**
    - never commit personal media to this repo
    - never reference `/private/` from public code
    - private data comes only from the submodule
    - native-first, and new runtime dependencies need justification
    - Baseline target
  - how to add a country or a photo.
- `CLAUDE.md`: a one-line `@AGENTS.md` import, so there's a single source of truth.
- `README.md`: rewritten for humans, covering what the site is, its history, and how to run it.

## Decided

- Hosting: Netlify
- URLs: `/japan/`-style with 301s
- Map: OSM tiles + CSS pastel filter now; Stadia watercolor later
- Lightbox: PhotoSwipe v5 (pinch-zoom)
- Repo: stays public; personal media + video in a private submodule repo
- Login: one shared password + magic links. Login page design approved (2016 blue hero + outlined field). Private pages get a small "Sign out" after the footer credit (approved).
- Public homepage video: generated landscape placeholder; video section optional in data
- Tests: build leak check, auth unit tests, Playwright leak + smoke + axe
- Updates: Dependabot monthly grouped; AGENTS.md + CLAUDE.md import

## Open questions

- Purge `daily.mp4` from public git history (keeps all commits/dates, changes hashes)? Decide before or after launch.

## Findings from phase 2 (Nov 2026)

- **`video.jpg` (the video poster) showed both faces.** It was in the public repo next to the video, and both now live in the private repo. The rest of the 102 photos, 25 banners, 7 maps and 7 flags were checked visually: no faces of the owners. Two photos show a stranger from behind at a distance (`thailand/13`, `indonesia/4`). The owner confirmed neither is them, so both stay public.
- **Images not taken by the owners** (confirmed): the country hero banners, which also appear as the homepage timeline cards. Never use them where the owners' own photos are expected (videos, slideshows, the photo grid). The placeholder slideshow uses one of the owners' photos per country (`cover` in `countries.json`).
- **Possible copyright issues to fix before relaunch:**
  - Several banners look like stock/wallpaper photos found online (for example the Thailand longtail boat, the Malaysia Petronas skyline and the Japan Fuji/pagoda shot).
  - The country maps and `gmap-southeast-asia` are Google Maps screenshots.
  - Plan: replace banners with the owners' own photos, and replace the maps with OSM-based renders (attribution included).
- **Photo originals are only 1200 px on the long side.** Pinch-zoom needs higher-resolution originals. The owner has the full-size files and will add them after the rebuild (about 2400–3000 px into `media/public/photos/`).
- **Time zones fixed:** Vietnam, Cambodia and Thailand were all set to `Asia/Jakarta`. The offset was the same (UTC+7), but the zones were wrong. They're now `Asia/Ho_Chi_Minh`, `Asia/Phnom_Penh` and `Asia/Bangkok`.
- **Astro's `image()` emits every referenced image into the public `/_astro/` folder.** So private photos use plain paths and our own pipeline. The leak test now also fails if a private file name shows up as a public asset.
- **Private repo is live:** `Silisav/travel-private` (private, confirmed 404 for anonymous visitors), mounted at `media/private/`. `.gitmodules` uses `git@github.com:Silisav/…` so Netlify can fetch it with a deploy key (phase 9). Locally, this repo's git config maps that address to the `github-personal` SSH alias.

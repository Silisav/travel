# Travel photo journal

**[asia.vasilis-tsirimokos.com](https://asia.vasilis-tsirimokos.com)**

A photo journal of four months travelling through Japan, Vietnam, Cambodia, Thailand, Malaysia, Indonesia and Greece in 2016.

First built in 2016 with Grunt, Bootstrap 3, jQuery and PhotoSwipe; rebuilt in 2026 with Astro and mostly native web platform features (`<dialog>`, CSS grid and nesting, `Intl`, responsive AVIF/WebP images), keeping the original design. The 2016 code is in the git history; the rebuild plan and decisions are in [PLAN.md](PLAN.md).

Personal photos live in a separate private repo (a submodule) behind a login; adding photos is drag-and-drop, see [AGENTS.md](AGENTS.md#adding-content).

## Run it

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

`npm run verify` runs the full check suite that CI runs.

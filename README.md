# Travel photo journal

**[asia.vasilis-tsirimokos.com](https://asia.vasilis-tsirimokos.com)**

A photo journal of four months travelling through Japan, Vietnam, Cambodia, Thailand, Malaysia, Indonesia and Greece in 2016.

First built in 2016 with Grunt, Bootstrap 3, jQuery and PhotoSwipe. It's now being rebuilt with Astro and modern, mostly native web platform features: CSS grid and nesting, `<dialog>`, View Transitions, `Intl` and responsive AVIF/WebP images. The original site is in `legacy/` while the rebuild is in progress, and the plan is in [PLAN.md](PLAN.md).

## Run it

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

`npm run verify` runs the full check suite that CI runs.

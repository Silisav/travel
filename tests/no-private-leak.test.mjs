// Build-time privacy guard: no public file in dist/ may reference the private area
// or any private media file. Run after `npm run build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PRIVATE_MANIFEST = new URL('../media/private/private.json', import.meta.url).pathname;
const TEXT_EXT = /\.(html|css|js|mjs|json|xml|txt|svg|webmanifest)$/;
// Files that may legitimately name /private/ (they disallow, route or redirect to it, without
// exposing anything in it). The login page only uses it as the place to go after signing in.
const ALLOWED = new Set(['robots.txt', '_redirects', '_headers', join('login', 'index.html')]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function publicTextFiles() {
  return [...walk(DIST)]
    .map((path) => relative(DIST, path))
    .filter((rel) => !rel.startsWith(`private${sep}`))
    .filter((rel) => TEXT_EXT.test(rel) || ALLOWED.has(rel));
}

test('dist/ exists (run `npm run build` first)', () => {
  assert.ok(existsSync(DIST), 'dist/ is missing: run `npm run build` before `npm test`');
});

test('public files never reference /private/', { skip: !existsSync(DIST) }, () => {
  const offenders = publicTextFiles().filter(
    (rel) => !ALLOWED.has(rel) && readFileSync(join(DIST, rel), 'utf8').includes('/private/'),
  );
  assert.deepEqual(offenders, [], `public files mention /private/: ${offenders.join(', ')}`);
});

test(
  'public files never mention a private media file name',
  { skip: !existsSync(DIST) || !existsSync(PRIVATE_MANIFEST) ? 'no private manifest' : false },
  () => {
    /** @type {{ photos?: { src: string }[], video?: { src: string, poster?: string } }} */
    const manifest = JSON.parse(readFileSync(PRIVATE_MANIFEST, 'utf8'));
    const paths = [
      ...(manifest.photos ?? []).map((photo) => photo.src),
      manifest.video?.src,
      manifest.video?.poster,
    ].filter((path) => typeof path === 'string');
    // Base names without extension: emitted assets get a hash and a new extension.
    const names = paths
      .map((path) =>
        path
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, ''),
      )
      .filter((name) => typeof name === 'string' && name.length > 3);

    const inText = publicTextFiles().flatMap((rel) => {
      const text = readFileSync(join(DIST, rel), 'utf8');
      return names.filter((name) => text.includes(name)).map((name) => `${rel} → ${name}`);
    });
    // Emitted assets keep their base name (e.g. _astro/IMG_1234.a1b2c3.webp), so also
    // catch private images that slipped into the public asset pipeline.
    const asFiles = [...walk(DIST)]
      .map((path) => relative(DIST, path))
      .filter((rel) => !rel.startsWith(`private${sep}`))
      .flatMap((rel) => {
        const base = rel.split(sep).pop() ?? '';
        return names
          .filter((name) => base.startsWith(`${name}.`))
          .map((name) => `${rel} ← ${name}`);
      });
    const offenders = [...inText, ...asFiles];
    assert.deepEqual(
      offenders,
      [],
      `private names found in public files:\n${offenders.join('\n')}`,
    );
  },
);

test(
  'private pages only link to other private pages',
  { skip: !existsSync(join(DIST, 'private')) ? 'no private build' : false },
  () => {
    const offenders = [...walk(join(DIST, 'private'))]
      .filter((path) => path.endsWith('.html'))
      .flatMap((path) => {
        const html = readFileSync(path, 'utf8');
        // page links: internal hrefs ending in "/" (assets like /_astro/x.webp are fine)
        return [...html.matchAll(/href="(\/[^"#?]*\/)"/g)]
          .map((match) => match[1])
          .filter((href) => !href.startsWith('/private/'))
          .filter((href) => href !== '/logout/') // the way out is meant to leave
          .map((href) => `${relative(DIST, path)} → ${href}`);
      });
    assert.deepEqual(
      offenders,
      [],
      `private pages link out to public pages:\n${offenders.join('\n')}`,
    );
  },
);

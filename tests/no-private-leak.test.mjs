// Build-time privacy guard: no public file in dist/ may reference the private area
// or any private media file. Run after `npm run build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PRIVATE_MANIFEST = new URL('../media/private/private.json', import.meta.url).pathname;
const TEXT_EXT = /\.(html|css|js|mjs|json|xml|txt|svg|webmanifest)$/;
// Files that may legitimately name /private/ (they disallow or route it, they don't expose it).
const ALLOWED = new Set(['robots.txt', '_redirects', '_headers']);

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
    /** @type {{ photos?: { file: string }[], video?: { file: string } }} */
    const manifest = JSON.parse(readFileSync(PRIVATE_MANIFEST, 'utf8'));
    const names = [...(manifest.photos ?? []), ...(manifest.video ? [manifest.video] : [])]
      .map((item) =>
        item.file
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, ''),
      )
      .filter((name) => typeof name === 'string' && name.length > 3);

    const offenders = publicTextFiles().flatMap((rel) => {
      const text = readFileSync(join(DIST, rel), 'utf8');
      return names.filter((name) => text.includes(name)).map((name) => `${rel} → ${name}`);
    });
    assert.deepEqual(
      offenders,
      [],
      `private names found in public files:\n${offenders.join('\n')}`,
    );
  },
);

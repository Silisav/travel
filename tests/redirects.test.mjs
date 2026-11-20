// Old 2016 URLs (/japan.html) must keep working: Netlify 301s them via public/_redirects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.trim().split(/\s+/));

test('every old page redirects permanently to its new address', () => {
  const old = [
    'map',
    'japan',
    'vietnam',
    'cambodia',
    'thailand',
    'malaysia',
    'indonesia',
    'greece',
  ];
  for (const page of old) {
    const rule = rules.find(([from]) => from === `/${page}.html`);
    assert.deepEqual(rule, [`/${page}.html`, `/${page}/`, '301'], page);
  }
});

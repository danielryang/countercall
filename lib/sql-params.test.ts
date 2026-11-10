import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Found against a real Supabase database: postgres.js double-encodes a JSON *string* sent to `$N::jsonb`, so every stored payload became a jsonb STRING and
// `jsonb_array_elements_text` failed with "cannot extract elements from a scalar". PGlite does not do this, so the unit tests could not see it.
// `$N::text::jsonb` makes the parameter text, which both drivers send as-is. This guard keeps the pattern out of production SQL.
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (['node_modules', '.next', 'sim', 'testing'].includes(f) ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
});

test('production SQL never casts a bare parameter to jsonb (use $N::text::jsonb)', () => {
  const bad = ['lib', 'app', 'scripts'].flatMap(walk).flatMap((p) => readFileSync(p, 'utf8').split('\n').map((l, i) => ({ p, i: i + 1, l })).filter(({ l }) => /\$\d+::jsonb/.test(l))).map(({ p, i }) => `${p}:${i}`);
  assert.deepEqual(bad, []);
});

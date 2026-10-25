// @vitest-environment node
// Home, Revenue and Now register live data, so a live resync on them answers and an after-live journey can start from
// each (scripts/perf.ts); their rails link every other route of their workspace. Each registers exactly what its feature
// needs, since /api/live refuses a name its caller may not read, and registers it before the empty state returns. Now
// was the third of them and registered one collection of the eleven it shows, so an assistant's approved change to a
// ticket or a release left the page stale until someone reloaded it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURES } from '../src/data/features.ts';

const source = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
const bodyOf = (rel: string, name: string) => {
  const text = source(rel);
  const start = text.indexOf(`export function ${name}(`);
  expect(start, `${name} in ${rel}`).toBeGreaterThan(-1);
  return text.slice(start);
};
const registered = (body: string) => {
  const m = body.match(/useLive\(\[([^\]]*)\](?:, [^)]*)?\)/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : null;
};
const needs = (id: 'home' | 'revenue' | 'now') => {
  const need = FEATURES[id].needs;
  const all = typeof need === 'object' && 'allOf' in need ? need.allOf : [need];
  return all.map((n) => String(n).replace(/:read$/, '')).sort();
};

/** Each workspace home, the module its body is in, and the test that returns the empty state before any part is drawn. */
const homes = [
  ['home', 'src/views/home.tsx', 'HomeBody', 'if (isEmpty(data))'],
  ['revenue', 'src/views/revenue.tsx', 'RevenueBody', 'if (isEmpty(data))'],
  ['now', 'src/views/now.tsx', 'NowBody', 'if (nothingArrived(data))'],
] as const;

describe('the workspace homes are live', () => {
  for (const [id, rel, name, empty] of homes) {
    it(`${name} registers every collection its feature needs, before the empty state`, () => {
      const body = bodyOf(rel, name);
      expect(registered(body)).toEqual(needs(id));
      const at = body.indexOf(empty);
      expect(at, `the empty state, "${empty}"`).toBeGreaterThan(-1);
      expect(body.indexOf('useLive(')).toBeLessThan(at);
    });
  }
});

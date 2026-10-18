// @vitest-environment node
// Home and Revenue register live data, so a live resync on them answers and an after-live journey can start from each
// (scripts/perf.ts); their rails link every other route of their workspace. Each registers exactly what its feature
// needs, since /api/live refuses a name its caller may not read, and registers it before the empty state returns.
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
const needs = (id: 'home' | 'revenue') => {
  const need = FEATURES[id].needs;
  const all = typeof need === 'object' && 'allOf' in need ? need.allOf : [need];
  return all.map((n) => String(n).replace(/:read$/, '')).sort();
};

describe('the workspace homes are live', () => {
  for (const [id, rel, name] of [['home', 'src/views/home.tsx', 'HomeBody'], ['revenue', 'src/views/revenue.tsx', 'RevenueBody']] as const) {
    it(`${name} registers every collection its feature needs, before the empty state`, () => {
      const body = bodyOf(rel, name);
      expect(registered(body)).toEqual(needs(id));
      expect(body.indexOf('useLive(')).toBeLessThan(body.indexOf('if (isEmpty(data))'));
    });
  }
});

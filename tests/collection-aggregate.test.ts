// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { aggregateRows, type AggregateQuery } from '@/lib/collection';
import { collections } from '@/data/collections';

/**
 * Every collection answers an aggregate query itself (FR-41, AC-14.4): an array collection over its rows, through
 * `aggregateRows`, a database as one grouped query, so a prepared query never reads a collection page by page to group
 * it. Each answer is checked here against the same figure worked out by hand from every row, whatever the product's
 * collections are; the sample's own figures and people are `tests/cli-collection-aggregate.test.ts`'s.
 */
type Row = Record<string, unknown>;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const near = (a: number | null, b: number) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThan(1e-6 * Math.max(1, Math.abs(b)));
};
const every = async (name: string): Promise<Row[]> => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];

describe('every collection answers aggregate', () => {
  it('is required of every collection the product declares, and each counts its own rows', async () => {
    for (const c of collections) {
      expect(typeof c.aggregate, c.name).toBe('function');
      const all = await every(c.name);
      const r = await c.aggregate({ measures: [{ name: 'n', agg: 'count' }] });
      expect(r.total.rows, c.name).toBe(all.length);
      expect(r.total.values.n, c.name).toBe(all.length);
    }
  });

  it('groups each collection by a field of its own, and every group equals the rows of that value', async () => {
    for (const c of collections) {
      const all = await every(c.name);
      if (!all.length) continue;
      const facet = Object.keys(all[0]).find((k) => k !== c.key && all.every((r) => typeof r[k] === 'string') && new Set(all.map((r) => r[k])).size <= 40);
      const field = Object.keys(all[0]).find((k) => all.every((r) => typeof r[k] === 'number'));
      if (!facet || !field) continue;
      const r = await c.aggregate({ group: { field: facet }, top: 50, measures: [{ name: 'n', agg: 'count' }, { name: 's', agg: 'sum', field }] });
      const keys = [...new Set(all.map((x) => String(x[facet])))];
      expect(r.groups.length + (r.others?.groups ?? 0), `${c.name} by ${facet}`).toBe(keys.length);
      for (const g of r.groups) {
        const mine = all.filter((x) => String(x[facet]) === g.key);
        expect(g.values.n, `${c.name} ${facet}=${g.key}`).toBe(mine.length);
        near(g.values.s, sum(mine.map((x) => Number(x[field]))));
      }
    }
  });

});

describe('aggregateRows', () => {
  const rows: Row[] = [
    { id: 'a', day: '2026-09-28T10:00:00Z', team: 'x', v: 1, nested: { w: 10 } },
    { id: 'b', day: '2026-09-29', team: 'x', v: 3, nested: { w: 20 } },
    { id: 'c', day: '2026-09-30', team: 'y', v: 5, nested: { w: 30 } },
    { id: 'd', day: '2026-10-01', team: 'y', v: null, nested: { w: 40 } },
    { id: 'e', day: '2026-10-05', team: 'z', v: 7, nested: { w: 50 } },
    { id: 'f', day: '2026-10-12', team: 'w', v: 9, nested: { w: 60 } },
  ];
  const q = (x: Partial<AggregateQuery>): AggregateQuery => ({ measures: [{ name: 'n', agg: 'count' }], ...x });

  it('works out count, sum, avg, min, max and p95, and a value with no number to work from is null', () => {
    const r = aggregateRows(rows, q({ measures: [{ name: 'n', agg: 'count' }, { name: 's', agg: 'sum', field: 'v' }, { name: 'a', agg: 'avg', field: 'v' }, { name: 'lo', agg: 'min', field: 'v' }, { name: 'hi', agg: 'max', field: 'v' }, { name: 'p', agg: 'p95', field: 'v' }, { name: 'w', agg: 'sum', field: 'nested.w' }, { name: 'none', agg: 'sum', field: 'missing' }] }));
    expect(r.total).toEqual({ rows: 6, values: { n: 6, s: 25, a: 5, lo: 1, hi: 9, p: 9, w: 210, none: null } });
  });

  it('counts the rows that meet a measure\'s own conditions', () => {
    const r = aggregateRows(rows, q({ measures: [{ name: 'xs', agg: 'count', where: [{ field: 'team', op: 'eq', value: 'x' }] }, { name: 'big', agg: 'count', where: [{ field: 'v', op: 'gt', value: 4 }] }] }));
    expect(r.total.values).toEqual({ xs: 2, big: 3 });
  });

  it('keeps the rows the conditions and the window keep, comparing a date by its first ten characters, both ends inclusive', () => {
    const r = aggregateRows(rows, q({ where: [{ field: 'team', op: 'in', value: ['x', 'y'] }, { field: 'id', op: 'ne', value: 'c' }], window: { field: 'day', from: '2026-09-28', to: '2026-09-30' } }));
    expect(r.total.rows).toBe(2);
    expect(aggregateRows(rows, q({ where: [{ field: 'v', op: 'lt', value: 5 }] })).total.rows).toBe(2);
  });

  it('returns the largest groups first, `top` of them, and the rest in `others` with their measures over their own rows', () => {
    const r = aggregateRows(rows, q({ group: { field: 'team' }, top: 2, measures: [{ name: 's', agg: 'sum', field: 'v' }, { name: 'n', agg: 'count' }] }));
    expect(r.groups.map((g) => g.key)).toEqual(['w', 'z']);
    expect(r.groups[0]).toEqual({ key: 'w', rows: 1, values: { s: 9, n: 1 } });
    expect(r.others).toEqual({ groups: 2, rows: 4, values: { s: 9, n: 4 } });
    expect(aggregateRows(rows, q({ group: { field: 'team' } })).others).toBeNull();
    expect(aggregateRows(rows, q({ group: { field: 'team' } })).groups).toHaveLength(4);
  });

  it('keys a day, a week by its Monday, a month by YYYY-MM and a weekday by its English name, and returns the latest buckets in date order', () => {
    const byDay = aggregateRows(rows, q({ group: { field: 'day', bucket: 'day' }, top: 3 }));
    expect(byDay.groups.map((g) => g.key)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12']);
    expect(byDay.others).toEqual({ groups: 3, rows: 3, values: { n: 3 } });
    expect(aggregateRows(rows, q({ group: { field: 'day', bucket: 'week' } })).groups.map((g) => [g.key, g.rows])).toEqual([['2026-09-28', 4], ['2026-10-05', 1], ['2026-10-12', 1]]);
    expect(aggregateRows(rows, q({ group: { field: 'day', bucket: 'month' } })).groups.map((g) => [g.key, g.rows])).toEqual([['2026-09', 3], ['2026-10', 3]]);
    // 28 Sept 2026 is a Monday; a weekday bucket reads Monday to Sunday.
    expect(aggregateRows(rows, q({ group: { field: 'day', bucket: 'weekday' } })).groups.map((g) => [g.key, g.rows])).toEqual([['Monday', 3], ['Tuesday', 1], ['Wednesday', 1], ['Thursday', 1]]);
  });

  it('returns at most 50 groups however many are asked for', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `r${i}`, k: `k${i}`, v: i }));
    let groups = -1;
    try { groups = aggregateRows(many, { group: { field: 'k' }, top: 80, measures: [{ name: 's', agg: 'sum', field: 'v' }] }).groups.length; } catch { groups = 0; }
    expect(groups).toBeLessThanOrEqual(50);
  });
});

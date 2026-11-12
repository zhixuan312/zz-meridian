// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// A product east of UTC: an instant late on 30 June is 1 July in Singapore, which is where a date filter's day is cut.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Asia/Singapore' } };
});

import { aggregateRows, type AggregateQuery } from '@/lib/collection';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A filter declares the type of its value (issue #145). A condition of another type is refused before anything is read,
 * naming the field and its type; a date filter compares calendar days in the reporting timezone, through the same rule
 * every day cut uses.
 */
const q: PreparedQuery = {
  sources: {
    calls: {
      collection: 'calls',
      date: 'at',
      filters: {
        latency: { ops: ['gt', 'lt'], type: 'number' },
        plan: { ops: ['eq'], values: ['a', 'b'], type: 'text' },
        lastActive: { ops: ['lt', 'gt'], type: 'date' },
        inBand: { ops: ['eq'], values: [true, false], type: 'boolean' },
      },
      facets: [],
      measures: { count: { label: 'Calls', unit: 'calls', definition: 'Calls kept', agg: 'count' } },
      drill: { columns: ['at'], address: (row) => `/?day=${String(row.at)}` },
      cannot: 'It counts calls, not people.',
    },
  },
};

const rights: ExploreRights = { readable: new Set(['calls']), hidden: () => [] };
const rows = [{ at: '2026-06-30T22:30:00Z', latency: 500, plan: 'a', lastActive: '2026-06-30T22:30:00Z', inBand: true }];
const seen: AggregateQuery[] = [];
const io: ExploreIO = {
  aggregate: async (_name, query) => {
    seen.push(query);
    return aggregateRows(rows, query);
  },
  read: async () => ({ rows: [], total: 0 }),
  today: '2026-07-01',
};
const ask = (where: { field: string; op: string; value: unknown }[]) =>
  runExplore(q, { source: 'calls', measures: ['count'], where }, rights, io, '/');

describe('a filter declares its value type', () => {
  it('is stated in the offer the model reads, before it makes a call of the wrong type', () => {
    const described = (exploreSchema(q, rights).shape.where as { description?: string }).description ?? '';
    expect(described).toContain('latency (a number; gt, lt)');
    expect(described).toContain('lastActive (a date, YYYY-MM-DD; lt, gt)');
  });

  it('refuses a string where a number is declared, naming the field and the type, before any read', async () => {
    seen.length = 0;
    await expect(ask([{ field: 'latency', op: 'gt', value: '500' }])).rejects.toThrow('latency takes a number.');
    expect(seen).toEqual([]);
  });

  it('refuses a wrongly typed value for text, boolean and date filters too', async () => {
    await expect(ask([{ field: 'plan', op: 'eq', value: 7 }])).rejects.toThrow('plan takes text.');
    await expect(ask([{ field: 'inBand', op: 'eq', value: 'true' }])).rejects.toThrow('inBand takes true or false.');
    await expect(ask([{ field: 'lastActive', op: 'lt', value: 'yesterday' }])).rejects.toThrow('lastActive takes a date, YYYY-MM-DD.');
    await expect(ask([{ field: 'lastActive', op: 'lt', value: '2026-02-30' }])).rejects.toThrow('lastActive takes a date, YYYY-MM-DD.');
  });

  it('answers a valid call unchanged', async () => {
    const answer = await ask([{ field: 'latency', op: 'gt', value: 100 }]);
    expect(answer.answer).toContain('Calls');
    expect(seen[0].where).toEqual([{ field: 'latency', op: 'gt', value: 100 }]);
  });

  it('compares a date filter by the day each side names in the reporting timezone', async () => {
    seen.length = 0;
    await ask([{ field: 'lastActive', op: 'lt', value: '2026-07-01' }]);
    expect(seen[0].where).toEqual([{ field: 'lastActive', op: 'lt', value: '2026-07-01', calendar: true }]);
    // The record is 1 July in Singapore, so it is not before 1 July; a bare calendar day names its own date.
    expect(aggregateRows(rows, seen[0]).total.rows).toBe(0);
    await ask([{ field: 'lastActive', op: 'lt', value: '2026-07-02' }]);
    expect(seen.map((s) => s.where)).toEqual([[{ field: 'lastActive', op: 'lt', value: '2026-07-01', calendar: true }], [{ field: 'lastActive', op: 'lt', value: '2026-07-02', calendar: true }]]);
    // The condition alone: the call's own window is on `at`, which the record is outside of for the same reason.
    expect(aggregateRows(rows, { where: seen[1].where, measures: seen[1].measures }).total.rows).toBe(1);
    expect(aggregateRows([{ lastActive: '2026-06-30' }], { where: [{ field: 'lastActive', op: 'lt', value: '2026-07-01', calendar: true }], measures: [{ name: 'n', agg: 'count' }] }).total.rows).toBe(1);
  });
});

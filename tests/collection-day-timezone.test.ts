// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// A product east of UTC: the sample instant 2026-06-30T22:30:00Z is 1 July, 06:30, in Singapore, and the UTC date is a
// day behind. A product west of UTC is the other way round, and the DST cases below pin that side.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Asia/Singapore' } };
});

import { aggregateRows, type AggregateQuery } from '@/lib/collection';
import { runExplore, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { dayOf, dayOfValue } from '@/lib/format-date';

/**
 * One rule cuts a day everywhere (issue #144): a bare `YYYY-MM-DD` is a calendar day and is kept as written, an instant
 * is its day in `app.timezone`. A collection's window and bucket, a drill's address and an agent's window must all agree
 * with the day the page prints.
 */
const rows = [{ date: '2026-06-30T22:30:00Z', n: 1 }];
const sum = { measures: [{ name: 'n', agg: 'sum' as const, field: 'n' }] };
const bucket = (b: 'day' | 'week' | 'month' | 'weekday') =>
  aggregateRows(rows, { ...sum, group: { field: 'date', bucket: b } }).groups.map((g) => g.key);
const count = (from: string, to: string) =>
  aggregateRows(rows, { ...sum, window: { field: 'date', from, to } }).total.rows;

const q: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'date',
      filters: {},
      facets: [],
      measures: { count: { label: 'Records', unit: 'count', definition: 'Records kept', agg: 'count' } },
      drill: { columns: ['date'], address: (row) => `/?period=all&day=${dayOfValue(row.date)}` },
      cannot: 'It counts records, not people.',
    },
  },
};

describe('a day cut follows app.timezone', () => {
  it('keeps a bare calendar date as written and reads an instant in the reporting timezone', () => {
    expect(dayOfValue('2026-06-30')).toBe('2026-06-30');
    expect(dayOfValue('2026-06-30T22:30:00Z')).toBe('2026-07-01');
    expect(dayOf('2026-06-30T22:30:00Z')).toBe('2026-07-01');
    expect(dayOfValue('not a date')).toBeNull();
    expect(dayOfValue(20260630)).toBeNull();
  });

  it('puts one record on the same day in its window and in its day, week, month and weekday bucket', () => {
    expect(count('2026-07-01', '2026-07-01')).toBe(1);
    expect(count('2026-06-30', '2026-06-30')).toBe(0);
    expect(bucket('day')).toEqual(['2026-07-01']);
    expect(bucket('month')).toEqual(['2026-07']);
    // 1 July 2026 is a Wednesday, so its week is the Monday 29 June.
    expect(bucket('week')).toEqual(['2026-06-29']);
    expect(bucket('weekday')).toEqual(['Wednesday']);
    // A calendar date is not an instant: it names its own day even west of UTC.
    expect(dayOfValue('2026-06-01', 'America/Los_Angeles')).toBe('2026-06-01');
  });

  it("gives an agent's window the same day the page and the collection cut", async () => {
    const seen: AggregateQuery[] = [];
    const io = {
      aggregate: async (_name: string, query: AggregateQuery) => {
        seen.push(query);
        return aggregateRows(rows, query);
      },
      read: async () => ({ rows: [], total: 0 }),
      today: dayOf('2026-06-30T22:30:00Z'),
    };
    const rights: ExploreRights = { readable: new Set(['days']), hidden: () => [] };
    await runExplore(q, { source: 'days', measures: ['count'], period: '7d' }, rights, io, '/');
    expect(io.today).toBe('2026-07-01');
    // Complete days end yesterday in the reporting timezone, not in UTC.
    expect(seen[0].window).toEqual({ field: 'date', from: '2026-06-24', to: '2026-06-30' });
    // The record is today in Singapore, so it is not yet in a complete-day window.
    expect(aggregateRows(rows, seen[0]).total.values.n ?? 0).toBe(0);
  });

  it('keeps the day across a DST change west of UTC', () => {
    // US daylight saving begins on 8 March 2026 at 02:00 in Los Angeles.
    expect(dayOfValue('2026-03-08T09:30:00Z', 'America/Los_Angeles')).toBe('2026-03-08'); // 01:30 PST
    expect(dayOfValue('2026-03-08T10:30:00Z', 'America/Los_Angeles')).toBe('2026-03-08'); // 03:30 PDT
    expect(dayOfValue('2026-03-09T06:59:00Z', 'America/Los_Angeles')).toBe('2026-03-08'); // 23:59 PDT
    expect(dayOfValue('2026-03-09T07:00:00Z', 'America/Los_Angeles')).toBe('2026-03-09'); // 00:00 PDT
  });
});

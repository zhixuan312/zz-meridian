// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A call grouped by a facet and compared with the window before states each group's change, not only the total's, so
 * "which model brought the most revenue, and how did that move?" is answered for each model (FR-39). A group with
 * nothing in the window before says so, and a bucket, whose keys are dates the window before does not share, states
 * the total's change alone.
 */
type Row = Record<string, unknown>;
const TODAY = '2026-10-13';
const DAY = 86_400_000;
const back = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
/** Sixty complete days of two models: large earns 10 a day in the last 30 and 8 before; small 5 then 5; tiny only in the last 30. */
const ROWS: Row[] = Array.from({ length: 60 }, (_, d) => [
  { day: back(d + 1), model: 'large', revenue: d < 30 ? 10 : 8 },
  { day: back(d + 1), model: 'small', revenue: 5 },
  ...(d < 30 ? [{ day: back(d + 1), model: 'tiny', revenue: 1 }] : []),
]).flat();

const QUERY: PreparedQuery = {
  sources: {
    usage: {
      collection: 'usage',
      date: 'day',
      filters: {},
      facets: ['model'],
      buckets: ['week'],
      measures: { revenue: { label: 'Revenue', unit: 'USD', definition: 'What was billed.', agg: 'sum', field: 'revenue' } },
      drill: { columns: ['day', 'model'], address: () => '/usage' },
      cannot: 'Nothing is kept by customer.',
    },
  },
};
const OWNER: ExploreRights = { readable: new Set(['usage']), hidden: () => [] };
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(ROWS, q),
  read: async (_: string, q: Query) => queryRows(ROWS, 'day', q),
  today: TODAY,
};
const ask = async (input: unknown) => (await runExplore(QUERY, input, OWNER, io, '/usage')).answer;
const line = (answer: string, key: string) => answer.split('\n').find((l) => l.startsWith(`- ${key}:`)) ?? '';

describe('a compared call states each group against the window before', () => {
  it('each group carries its own figure in the window before and its change', async () => {
    const answer = await ask({ source: 'usage', measures: ['revenue'], by: 'model', period: '30d', compare: true });
    expect(line(answer, 'large')).toContain('300 USD');
    expect(line(answer, 'large')).toContain('the window before 240 USD, up 25%');
    expect(line(answer, 'small')).toContain('the window before 150 USD, unchanged');
    expect(line(answer, 'tiny')).toContain('none in the window before');
  });

  it('without compare, a group states its figure alone', async () => {
    const answer = await ask({ source: 'usage', measures: ['revenue'], by: 'model', period: '30d' });
    expect(line(answer, 'large')).not.toContain('window before');
  });

  it('a bucket states the total against the window before, and no week against another', async () => {
    const answer = await ask({ source: 'usage', measures: ['revenue'], bucket: 'week', period: '30d', compare: true });
    expect(answer).toContain('The window before');
    expect(answer.split('\n').filter((l) => l.startsWith('- ') && l.includes('window before'))).toEqual([]);
  });
});

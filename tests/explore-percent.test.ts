// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A margin is stated as the pages state it: it honours its `scale` as a ratio does, so a margin of 0.625
 * declared with `scale: 0.01` reads 62.5 %; and its change on the window before is in percentage points, as Home states
 * its gross margin, since a share of a share says little: "unchanged" under 0.05 points, else to one decimal. Every
 * other measure, a ratio in % included (Usage states its error rate's change so), keeps its change as a percent of the
 * window before.
 */
type Row = Record<string, unknown>;
const TODAY = '2026-10-13';
const DAY = 86_400_000;
const back = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
/** Sixty complete days: a day's revenue is 100, and its cost 37.5 in the last 30 (a margin of 62.5%) and 40 in the 30 before (60%). */
const DAYS: Row[] = Array.from({ length: 60 }, (_, d) => ({ day: back(d + 1), revenue: 100, cost: d < 30 ? 37.5 : 40 }));

const QUERY: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'day',
      filters: {},
      facets: [],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'What was billed.', agg: 'sum', field: 'revenue' },
        cost: { label: 'Cost', unit: 'USD', definition: 'What was spent.', agg: 'sum', field: 'cost' },
        margin: { label: 'Margin', unit: '%', definition: 'Revenue less cost, over revenue.', derive: 'margin', of: ['revenue', 'cost'], scale: 0.01 },
        fraction: { label: 'Margin as a fraction', unit: 'of revenue', definition: 'The same, unscaled.', derive: 'margin', of: ['revenue', 'cost'] },
        costShare: { label: 'Cost share', unit: '%', definition: 'Cost as a share of revenue.', derive: 'ratio', of: ['cost', 'revenue'], scale: 0.01 },
      },
      drill: { columns: ['day'], address: () => '/days' },
      cannot: 'Nothing is kept by customer.',
    },
  },
};
const OWNER: ExploreRights = { readable: new Set(['days']), hidden: () => [] };
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(DAYS, q),
  read: async (_: string, q: Query) => queryRows(DAYS, 'day', q),
  today: TODAY,
};
const ask = async (input: unknown) => (await runExplore(QUERY, input, OWNER, io, '/days')).answer;
const before = (answer: string) => answer.split('\n').find((l) => l.startsWith('The window before')) ?? '';

describe('a margin is stated as the pages state it', () => {
  it('a margin honours its scale, as a ratio does, and one without a scale stays a fraction', async () => {
    const answer = await ask({ source: 'days', measures: ['margin', 'fraction'], period: '30d' });
    expect(answer).toContain('62.5 %');
    expect(answer).not.toContain('62.5 of revenue');
    expect(answer).toMatch(/0\.6[23] of revenue/);
  });

  it('a margin states its change in percentage points, and every other measure, a ratio in % included, as a percent of the window before', async () => {
    const line = before(await ask({ source: 'days', measures: ['margin', 'costShare', 'cost'], period: '30d', compare: true }));
    expect(line).toContain('Margin 60 %, up 2.5 points');
    expect(line).toContain('Cost share 40 %, down 6.25%');
    expect(line).toContain('Cost 1,200 USD, down 6.25%');
  });
});

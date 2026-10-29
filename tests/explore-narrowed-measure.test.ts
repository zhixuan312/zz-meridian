// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A measure's line says when the call narrowed it: "Runs: 1 run" under `state eq failed` is one failed run, not every
 * run of the window, and the line says so after the measure's own definition.
 */
type Row = Record<string, unknown>;
const TODAY = '2026-10-13';
const ROWS: Row[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, startedAt: '2026-10-10T09:00:00Z', state: 'passed', suite: 'smoke' })),
  { id: 'f0', startedAt: '2026-10-11T09:00:00Z', state: 'failed', suite: 'smoke' },
];
const QUERY: PreparedQuery<{ id: string }> = {
  sources: {
    runs: {
      collection: 'tests',
      date: 'startedAt',
      filters: { state: { ops: ['eq'], values: ['passed', 'failed'] } },
      facets: ['state'],
      measures: { runs: { label: 'Runs', unit: 'runs', definition: 'The runs that started in the window, however they ended.', agg: 'count' } },
      drill: { columns: ['id', 'state'], address: (r) => `/tests?run=${String(r.id)}` },
      cannot: '',
    },
  },
};
const OWNER: ExploreRights = { readable: new Set(['tests']), hidden: () => [] };
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(ROWS, q),
  read: async (_: string, q: Query) => queryRows(ROWS, 'id', q),
  today: TODAY,
};
const runsLine = (answer: string) => answer.split('\n').find((l) => l.startsWith('Runs: ')) ?? '';

describe("a measure's line", () => {
  it('says the conditions that narrowed it', async () => {
    const { answer } = await runExplore(QUERY, { source: 'runs', measures: ['runs'], where: [{ field: 'state', op: 'eq', value: 'failed' }], period: '7d' }, OWNER, io, '/tests');
    expect(runsLine(answer)).toBe('Runs: 1 run. The runs that started in the window, however they ended. This figure is only of those where state eq failed.');
  });

  it('says nothing more when nothing narrowed it', async () => {
    const { answer } = await runExplore(QUERY, { source: 'runs', measures: ['runs'], period: '7d' }, OWNER, io, '/tests');
    expect(runsLine(answer)).toBe('Runs: 9 runs. The runs that started in the window, however they ended.');
  });

  it("names a detail page's own conditions too", async () => {
    const fixed: PreparedQuery<{ id: string }> = { ...QUERY, fixed: async () => ({ runs: [{ field: 'suite', op: 'eq', value: 'smoke' }] }) };
    const { z } = await import('zod');
    const { answer } = await runExplore(fixed, { id: 'x', source: 'runs', measures: ['runs'], period: '7d' }, OWNER, io, '/tests/x', z.object({ id: z.string() }));
    expect(runsLine(answer)).toContain('This figure is only of those where suite eq smoke.');
  });
});

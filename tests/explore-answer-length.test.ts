// @vitest-environment node
/**
 * A prepared query answers in text, at most 3,000 characters (`docs/assistant.md`, "Limits"): the whole answer, not the
 * rows inside it. A summary that is over budget on its own cannot be shortened by dropping rows, so the answer has to
 * be held as a whole — and say what it left out, never be cut mid-sentence.
 */
import { describe, expect, it } from 'vitest';

import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

const MAX_ANSWER = 3000;
const TODAY = '2026-10-13';
const back = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const ROWS: Record<string, unknown>[] = Array.from({ length: 40 }, (_, d) => [
  { id: `a${d}`, day: back(d + 1), plan: 'a', revenue: 100.25 },
  { id: `b${d}`, day: back(d + 1), plan: 'b', revenue: 40 },
]).flat();

// Three measures, the most one call may ask for, each with the sentence its own declaration carries: a declaration
// written in full sentences is over 3,000 characters before a single row is drilled, which is what the answer's own
// length has to survive. The rows cannot be shortened to pay for it — there is nothing to drop.
const words = (i: number) => `Measure ${i} counts the rows the window keeps for the plan, as the plan's own page states it, and this sentence is the whole of what it means, written out so that a reader of the answer is told it without opening the page: ${'and what it holds is the plan of the row, as the plan itself is written on the page it belongs to. '.repeat(8)}`;
const many = Object.fromEntries([0, 1, 2].map((i) => [`m${i}`, {
  label: `Measure number ${i} of the plan`,
  unit: 'days' as const,
  definition: words(i),
  agg: 'count' as const,
}]));

const QUERY: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'day',
      filters: { plan: { ops: ['eq'], values: ['a', 'b'] } },
      facets: ['plan'],
      measures: many,
      drill: { columns: ['id', 'revenue'], address: (r) => `/days/${String(r.id)}` },
      cannot: '',
    },
  },
};
const OWNER: ExploreRights = { readable: new Set(['days']), hidden: () => [] };
const io: ExploreIO = {
  aggregate: async (_: string, q: AggregateQuery) => aggregateRows(ROWS, q),
  read: async (_: string, q: Query) => queryRows(ROWS, 'id', q),
  today: TODAY,
};
const asked = Object.keys(many);

describe("a prepared query's answer", () => {
  it('is held to its own length, and says what it left out', async () => {
    const { answer } = await runExplore(QUERY, { source: 'days', measures: asked, by: 'plan', period: '30d' }, OWNER, io, '/days');
    expect(answer.length).toBeLessThanOrEqual(MAX_ANSWER);
    expect(answer).toMatch(/more (?:lines?|rows?) (?:are|is) not shown/);
    // Held by whole lines: nothing is cut mid-sentence, so the last kept line ends as a line.
    expect(answer.endsWith('.')).toBe(true);
  });

  it('is held to its own length with no rows asked for either', async () => {
    const { answer } = await runExplore(QUERY, { source: 'days', measures: asked, by: 'plan', period: '30d', rows: 0 }, OWNER, io, '/days');
    expect(answer.length).toBeLessThanOrEqual(MAX_ANSWER);
    expect(answer).toMatch(/more lines? are not shown/);
  });

  it('says one line is not shown when one line is what it dropped, and not "1 line are"', async () => {
    // Sized from the answer's own length rather than by a character count written here: with the whole answer `over`
    // characters past the cap, holding the last line back is what brings it inside — and an assistant reads that line,
    // so its count, noun and verb have to agree.
    const short = (i: number, pad: number) => ({ label: `Measure number ${i} of the plan`, unit: 'days' as const, definition: `Measure ${i} counts the rows the window keeps for the plan.${'x'.repeat(pad)}`, agg: 'count' as const });
    const at = async (pad: number) => {
      const query = { ...QUERY, sources: { days: { ...QUERY.sources.days, measures: Object.fromEntries([0, 1, 2].map((i) => [`m${i}`, short(i, i === 0 ? pad : 0)])) } } } as PreparedQuery;
      const { answer } = await runExplore(query, { source: 'days', measures: asked, by: 'plan', period: '30d', rows: 0 }, OWNER, io, '/days');
      return answer;
    };
    const whole = await at(0);
    expect(whole.length).toBeLessThan(MAX_ANSWER);
    const answer = await at(MAX_ANSWER - whole.length + 3);
    expect(answer.split('\n').at(-1)).toBe('1 more line is not shown.');
    expect(answer).not.toMatch(/1 more line are not shown/);
  });
});

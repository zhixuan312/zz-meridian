// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// A product made with `--currency GBP`: its pages write money in pounds, and so must its prepared queries.
vi.mock('@/app.config', async (original) => {
  const actual = await original<typeof import('@/app.config')>();
  return { ...actual, app: { ...actual.app, currency: 'GBP' } };
});

import { exploreSchema, runExplore, type PreparedQuery } from '@/lib/explore';
import { formatCost } from '@/lib/format';
import { back, memoryIO, reader } from './explore-io';

/**
 * A money measure is written as the pages write money, through `formatCost` in `app.currency`, and its line names the
 * currency once, so an agent handed a page's context and the page's prepared query reads one unit for one figure.
 */
type Row = Record<string, unknown>;
/** Sixty complete days of two plans: a earns 100.25 a day, b 40 a day in the last 30 and 50 before. */
const ROWS: Row[] = Array.from({ length: 60 }, (_, d) => [
  { id: `a${d}`, day: back(d + 1), plan: 'a', revenue: 100.25 },
  { id: `b${d}`, day: back(d + 1), plan: 'b', revenue: d < 30 ? 40 : 50 },
]).flat();

const QUERY: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'day',
      filters: { plan: { ops: ['eq'], values: ['a', 'b'] } },
      facets: ['plan'],
      measures: {
        revenue: { label: 'Revenue', unit: 'money', definition: 'What was billed.', agg: 'sum', field: 'revenue' },
        days: { label: 'Days', unit: 'days', definition: 'Rows kept.', agg: 'count' },
      },
      drill: { columns: ['id', 'revenue'], address: (r) => `/days/${String(r.id)}` },
      cannot: '',
    },
  },
};
const OWNER = reader('days');
const io = memoryIO(ROWS);
const ask = async (input: unknown) => (await runExplore(QUERY, input, OWNER, io, '/days')).answer;

describe('a money measure', () => {
  it('is written in the product\'s currency, as the pages write it, in its head, its window before and its groups', async () => {
    const answer = await ask({ source: 'days', measures: ['revenue', 'days'], by: 'plan', period: '30d', compare: true });
    expect(formatCost(4207.5)).toBe('£4,207.50');
    expect(answer).toContain('Revenue, in GBP: £4,207.50.');
    expect(answer).toContain('The window before, ');
    expect(answer).toContain('Revenue £4,507.50, down 6.66%');
    expect(answer).toMatch(/^- a: Revenue £3,007\.50, Days 30 days/m);
    expect(answer).toMatch(/^- b: Revenue £1,200\.00, Days 30 days \(the window before £1,500\.00, down 20%/m);
    expect(answer).not.toMatch(/USD|\bmoney\b/);
    // One code, one mark: GBP is named once, and every amount carries the pound sign alone.
    expect(answer.match(/GBP/g)).toHaveLength(1);
    expect(answer).not.toContain('$');
  });

  it('is described to the model in the product\'s currency', () => {
    const json = JSON.stringify(z.toJSONSchema(exploreSchema(QUERY, OWNER)));
    expect(json).toContain('revenue (Revenue, GBP)');
    expect(json).not.toMatch(/USD|\bmoney\b/);
  });
});

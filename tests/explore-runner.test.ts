// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { aggregateRows, queryRows, type AggregateQuery, type Query } from '@/lib/collection';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/**
 * A prepared query (FR-38 to FR-40): what a page's author lets an agent ask of the page's own collections, answered as
 * text with its window, its measures and their units, at most eight groups and twenty rows, each with its address, read
 * through one `aggregate` for each source and window and never page by page. Driven here over collections of its own, so
 * the runner is held apart from any page.
 */
type Row = Record<string, unknown>;
const TODAY = '2026-10-13';
const DAY = 86_400_000;
const back = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
const TEAMS = ['ash', 'birch', 'cedar', 'elm', 'fir', 'hazel', 'larch', 'maple', 'oak', 'pine', 'rowan', 'yew'];

/** 120 days of orders, one a team a day; the day in progress has one more that no answer may count. */
const ORDERS: Row[] = [
  ...Array.from({ length: 120 }, (_, d) => TEAMS.map((team, t) => ({ id: `o${d}-${t}`, day: back(d + 1), team, v: 1000 + t * 100_000, cost: 7, note: 'n'.repeat(400) }))).flat(),
  { id: 'today', day: TODAY, team: 'ash', v: 5_000_000, cost: 7, note: '' },
];
const COSTS: Row[] = Array.from({ length: 120 }, (_, d) => ({ day: back(d + 1), amount: 0 }));
const PLAIN: Row[] = [{ id: 'p1', kind: 'a', n: 2 }, { id: 'p2', kind: 'b', n: 3 }];

const QUERY: PreparedQuery = {
  sources: {
    orders: {
      collection: 'orders',
      date: 'day',
      filters: { team: { ops: ['eq', 'ne', 'in'], values: TEAMS }, v: { ops: ['gt', 'lt'] } },
      facets: ['team'],
      buckets: ['day', 'week', 'month', 'weekday'],
      measures: {
        n: { label: 'Orders', unit: 'orders', definition: 'Orders placed.', agg: 'count' },
        total: { label: 'Order value', unit: 'USD', definition: 'What the orders were worth.', agg: 'sum', field: 'v' },
        secret: { label: 'Cost of the orders', unit: 'USD', definition: 'A field only a page may see.', agg: 'sum', field: 'cost' },
        share: { label: 'Value per cost', unit: 'x', definition: 'Order value over what was spent.', derive: 'ratio', of: ['total', 'costs.spent'] },
      },
      drill: { columns: ['id', 'team', 'note'], address: (r) => `/orders/${String(r.id)}` },
      cannot: 'Who placed an order is not recorded.',
    },
    costs: {
      collection: 'costs',
      date: 'day',
      filters: {},
      facets: [],
      measures: { spent: { label: 'Spent', unit: 'USD', definition: 'What was spent.', agg: 'sum', field: 'amount' } },
      drill: { columns: ['day'], address: () => '/costs' },
      cannot: 'Costs are not kept by team.',
    },
    plain: {
      collection: 'plain',
      filters: { kind: { ops: ['eq'], values: ['a', 'b'] } },
      facets: ['kind'],
      measures: { n: { label: 'Things', unit: 'things', definition: 'Things counted.', agg: 'sum', field: 'n' } },
      drill: { columns: ['id', 'kind'], address: (r) => `/plain/${String(r.id)}` },
      cannot: 'Nothing is dated here.',
    },
  },
};

const OWNER: ExploreRights = { readable: new Set(['orders', 'costs', 'plain']), hidden: () => [] };
/** A person who may not read costs, and for whom the orders' cost is a field only a page shows. */
const VIEWER: ExploreRights = { readable: new Set(['orders', 'plain']), hidden: (c) => (c === 'orders' ? ['cost'] : []) };

function io(tables: Record<string, Row[]> = { orders: ORDERS, costs: COSTS, plain: PLAIN }) {
  const aggregate = vi.fn(async (name: string, q: AggregateQuery) => aggregateRows(tables[name], q));
  const read = vi.fn(async (name: string, q: Query) => queryRows(tables[name], 'id', q));
  const out = { aggregate, read, today: TODAY };
  return out satisfies ExploreIO;
}
const run = (input: unknown, rights = OWNER, x = io()) => runExplore(QUERY, input, rights, x, '/orders');
const json = (rights: ExploreRights) => JSON.stringify(z.toJSONSchema(exploreSchema(QUERY, rights)));
const groupLines = (answer: string) => answer.split('\n').filter((l) => /^- /.test(l));

describe('the input a person is offered', () => {
  it('is one object whose source names the sources this person may read', () => {
    const offered = (rights: ExploreRights) => z.toJSONSchema(exploreSchema(QUERY, rights)) as { type?: string; properties?: Record<string, { enum?: unknown[] }> };
    expect(offered(OWNER).type).toBe('object');
    expect(offered(OWNER).properties?.source?.enum).toEqual(['orders', 'costs', 'plain']);
    expect(offered(VIEWER).properties?.source?.enum).toEqual(['orders', 'plain']);
  });

  it('names only what the declaration declares, within 6,000 characters of JSON Schema', () => {
    const owner = json(OWNER);
    for (const name of ['"orders"', '"costs"', '"plain"', '"team"', '"total"', '"share"', '"week"', '"weekday"', '"30d"', '"all"']) expect(owner, name).toContain(name);
    expect(owner.length).toBeLessThanOrEqual(6000);
  });

  it('leaves out, for a person who may not read them, a source, a measure over a hidden field and a measure that reads that source', () => {
    const viewer = json(VIEWER);
    expect(viewer).toContain('"orders"');
    for (const name of ['"costs"', '"secret"', '"share"', '"spent"']) expect(viewer, name).not.toContain(name);
  });

  it('refuses a name the declaration lacks, a facet with a bucket, more than three measures and more than twenty rows', async () => {
    await expect(run({ source: 'orders', measures: ['n'], where: [{ field: 'note', op: 'eq', value: 'x' }] })).rejects.toThrow();
    await expect(run({ source: 'orders', measures: ['n'], where: [{ field: 'v', op: 'eq', value: 1 }] })).rejects.toThrow();
    await expect(run({ source: 'orders', measures: ['n'], by: 'note' })).rejects.toThrow();
    await expect(run({ source: 'orders', measures: ['n'], by: 'team', bucket: 'day' })).rejects.toThrow();
    await expect(run({ source: 'orders', measures: ['n', 'total', 'share', 'secret'] })).rejects.toThrow();
    await expect(run({ source: 'orders', measures: ['n'], rows: 21 })).rejects.toThrow();
    await expect(run({ source: 'nowhere', measures: ['n'] })).rejects.toThrow();
  });

  it('answers a declared name withheld from this person "You do not have access to that."', async () => {
    for (const input of [{ source: 'costs', measures: ['spent'] }, { source: 'orders', measures: ['secret'] }, { source: 'orders', measures: ['share'] }]) {
      const x = io();
      expect((await run(input, VIEWER, x)).answer, JSON.stringify(input)).toBe('You do not have access to that.');
      expect(x.aggregate).not.toHaveBeenCalled();
    }
  });
});

describe('an answer', () => {
  it('is the window of complete days, 30 when none is asked, each measure with its label and unit, and what it cannot say', async () => {
    const x = io();
    const { answer, address } = await run({ source: 'orders', measures: ['n', 'total'] }, OWNER, x);
    expect(x.aggregate).toHaveBeenCalledTimes(1);
    expect(x.aggregate.mock.calls[0][1].window).toEqual({ field: 'day', from: back(30), to: back(1) });
    expect(answer).toContain(back(30));
    expect(answer).toContain(back(1));
    expect(answer).toContain('Orders');
    expect(answer).toContain('360 orders');
    expect(answer).toContain('USD');
    // 30 days of twelve teams' values, 1,000 + t × 100,000 each: 30 × (12,000 + 6,600,000).
    expect(answer).toContain('198,360,000');
    expect(answer).toContain('Who placed an order is not recorded.');
    expect(address).toBe('/orders');
    expect(answer).not.toContain('5,000,000');
  });

  it('reads the equal window before as a second aggregate when asked, and says `all` has none', async () => {
    const x = io();
    const { answer } = await run({ source: 'orders', measures: ['n'], period: '7d', compare: true }, OWNER, x);
    expect(x.aggregate).toHaveBeenCalledTimes(2);
    expect(x.aggregate.mock.calls.map((c) => c[1].window)).toEqual([{ field: 'day', from: back(7), to: back(1) }, { field: 'day', from: back(14), to: back(8) }]);
    expect(answer).toContain('84 orders');
    expect(answer).toContain(back(14));
    const all = await run({ source: 'orders', measures: ['n'], period: 'all', compare: true });
    expect(all.answer).toMatch(/`?all`? has no window before/i);
  });

  it('refuses a period, a window before, a facet or a measure the named source does not declare', async () => {
    await expect(run({ source: 'plain', measures: ['n'], period: '7d' })).rejects.toThrow();
    await expect(run({ source: 'plain', measures: ['n'], compare: true })).rejects.toThrow();
    await expect(run({ source: 'plain', measures: ['n'], bucket: 'day' })).rejects.toThrow();
    await expect(run({ source: 'plain', measures: ['n'], by: 'team' })).rejects.toThrow();
    await expect(run({ source: 'plain', measures: ['total'] })).rejects.toThrow();
    await expect(run({ source: 'costs', measures: ['spent'], by: 'team' })).rejects.toThrow();
    const x = io();
    const { answer } = await run({ source: 'plain', measures: ['n'], by: 'kind' }, OWNER, x);
    expect(x.aggregate.mock.calls[0][1].window).toBeUndefined();
    expect(groupLines(answer).map((l) => l.slice(2, 3))).toEqual(['b', 'a']);
  });

  it('holds at most eight groups, largest first, and counts the rest with their own figures', async () => {
    const { answer } = await run({ source: 'orders', measures: ['total'], by: 'team' });
    const lines = groupLines(answer);
    expect(lines.slice(0, 8).map((l) => l.slice(2).split(':')[0])).toEqual(['yew', 'rowan', 'pine', 'oak', 'maple', 'larch', 'hazel', 'fir']);
    expect(answer).toMatch(/\b4 others\b/);
    // The four smallest teams over 30 days: 30 × (4 × 1,000 + 600,000).
    expect(answer).toContain('18,120,000');
  });

  it('holds the latest eight buckets in date order, and a weekday bucket Monday to Sunday', async () => {
    const { answer } = await run({ source: 'orders', measures: ['n'], bucket: 'day' });
    const keys = groupLines(answer).slice(0, 8).map((l) => l.slice(2, 12));
    expect(keys).toEqual(Array.from({ length: 8 }, (_, i) => back(8 - i)));
    const week = await run({ source: 'orders', measures: ['n'], bucket: 'weekday', period: '90d' });
    expect(groupLines(week.answer).map((l) => l.slice(2).split(':')[0])).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  });

  it('works out a measure derived from another source over the same window, and refuses one filtered or grouped', async () => {
    const x = io({ orders: ORDERS, costs: COSTS.map((c) => ({ ...c, amount: 26_448_000 })), plain: PLAIN });
    const { answer } = await run({ source: 'orders', measures: ['share'], period: '7d' }, OWNER, x);
    expect(x.aggregate).toHaveBeenCalledTimes(2);
    expect(x.aggregate.mock.calls.map((c) => c[0]).sort()).toEqual(['costs', 'orders']);
    for (const c of x.aggregate.mock.calls) expect(c[1].window, c[0]).toEqual({ field: 'day', from: back(7), to: back(1) });
    // Each day's orders are worth 6,612,000 and 26,448,000 was spent: a quarter.
    expect(answer).toContain('0.25');
    for (const input of [{ source: 'orders', measures: ['share'], by: 'team' }, { source: 'orders', measures: ['share'], where: [{ field: 'team', op: 'eq', value: 'ash' }] }]) {
      expect((await run(input)).answer).toMatch(/cannot be filtered or grouped/i);
    }
  });

  it('drills to at most twenty rows with one read, each with its console address, and fits 3,000 characters', async () => {
    const x = io();
    const { answer } = await run({ source: 'orders', measures: ['n'], where: [{ field: 'team', op: 'in', value: ['ash', 'birch'] }], by: 'team', rows: 20 }, OWNER, x);
    expect(x.read).toHaveBeenCalledTimes(1);
    expect(x.read.mock.calls[0][1].limit).toBeLessThanOrEqual(20);
    expect(answer.length).toBeLessThanOrEqual(3000);
    const drilled = answer.split('\n').filter((l) => l.includes('/orders/o'));
    expect(drilled.length).toBeGreaterThan(0);
    expect(drilled.length).toBeLessThanOrEqual(20);
    expect(answer).toContain('60 orders');
    // Twenty rows of 400-character notes do not fit: rows are dropped from the end, said in a line of its own, and what
    // the source cannot say, which comes before them, is kept.
    expect(answer).toContain('Who placed an order is not recorded.');
    const left = /^(\d+) more rows? (?:are|is) not shown\.$/m.exec(answer);
    expect(left, 'the line saying how many rows were left out').not.toBeNull();
    expect(drilled.length + Number(left![1])).toBe(20);
  });

  it('answers from the address the query names for the call', async () => {
    const q: PreparedQuery = { ...QUERY, address: ({ source, period }) => `/${source}?period=${period ?? '30d'}` };
    const { address } = await runExplore(q, { source: 'orders', measures: ['n'], period: '7d' }, OWNER, io(), '/orders');
    expect(address).toBe('/orders?period=7d');
  });
});

describe('a collection of a million rows', () => {
  it('is asked one aggregate for its source and window and read no page of rows', async () => {
    const big: Row[] = Array.from({ length: 1_000_000 }, (_, i) => ({ id: `b${i}`, day: back((i % 120) + 1), team: TEAMS[i % 12], v: 1, cost: 0, note: '' }));
    const x = io({ orders: big, costs: COSTS, plain: PLAIN });
    const { answer } = await run({ source: 'orders', measures: ['n', 'total'], by: 'team', period: '90d' }, OWNER, x);
    expect(x.aggregate).toHaveBeenCalledTimes(1);
    expect(x.read).not.toHaveBeenCalled();
    // Days 1 to 90 of 120, over rows spread one a day in turn: 40 × 8,334 + 50 × 8,333.
    expect(answer).toContain('750,010');
  });
});

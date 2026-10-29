// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own records and people, which a product replaces.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { collections } from '@/data/collections';
import { aggregate } from '@/data/read';

/** The sample's collections answer `aggregate` as its pages read them, and the authorized read asks the person's grant (FR-41, AC-14.4). */
type Row = Record<string, unknown>;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const near = (a: number | null, b: number) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThan(1e-6 * Math.max(1, Math.abs(b)));
};
const every = async (name: string): Promise<Row[]> => (await collections.find((c) => c.name === name)!.query({})).rows as Row[];

beforeEach(() => { jar.value = undefined; });

describe("the sample's collections answer aggregate", () => {
  it('answers the sample the way its pages read it: requests by weekday at 22:00, revenue by plan over a window, runs by how they ended', async () => {
    const hours = collections.find((c) => c.name === 'hours')!;
    const at22 = await hours.aggregate({ where: [{ field: 'hour', op: 'eq', value: 22 }], group: { field: 'weekday' }, measures: [{ name: 'r', agg: 'sum', field: 'requests' }] });
    const rows = (await every('hours')).filter((h) => h.hour === 22);
    expect(at22.groups).toHaveLength(7);
    for (const g of at22.groups) expect(g.values.r, `weekday ${g.key}`).toBe(sum(rows.filter((h) => String(h.weekday) === g.key).map((h) => Number(h.requests))));
    // Largest first by the first measure.
    const values = at22.groups.map((g) => g.values.r as number);
    expect(values).toEqual([...values].sort((a, b) => b - a));

    const days = collections.find((c) => c.name === 'days')!;
    const all = await every('days');
    const to = String(all.at(-2)!.date), from = String(all.at(-31)!.date);
    const window = await days.aggregate({ window: { field: 'date', from, to }, measures: [{ name: 'e', agg: 'sum', field: 'revenueByPlan.Enterprise' }, { name: 'd', agg: 'count' }] });
    const inside = all.filter((d) => String(d.date) >= from && String(d.date) <= to);
    expect(window.total.rows).toBe(30);
    near(window.total.values.e, sum(inside.map((d) => (d.revenueByPlan as Record<string, number>).Enterprise)));

    const tests = collections.find((c) => c.name === 'tests')!;
    const runs = await every('tests');
    const passed = await tests.aggregate({ measures: [{ name: 'p', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'passed' }] }, { name: 'n', agg: 'count' }] });
    expect(passed.total.values.p).toBe(runs.filter((r) => r.state === 'passed').length);
    expect(passed.total.values.n).toBe(runs.length);
  });
});

describe('the authorized aggregate', () => {
  it('asks the grant read() asks, at the moment it runs, and says when it ran', async () => {
    jar.value = 'members_1';
    const owner = await aggregate('costs', { measures: [{ name: 'c', agg: 'sum', field: 'compute' }] });
    expect(owner.total.values.c).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(owner.observedAt))).toBe(false);
    jar.value = 'members_12';
    await expect(aggregate('costs', { measures: [{ name: 'c', agg: 'sum', field: 'compute' }] })).rejects.toThrow();
    await expect(aggregate('members', { measures: [{ name: 'n', agg: 'count' }] })).rejects.toThrow();
    expect((await aggregate('days', { measures: [{ name: 'n', agg: 'count' }] })).total.values.n).toBeGreaterThan(300);
  });
});

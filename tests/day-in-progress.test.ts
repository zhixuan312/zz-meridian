// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { clock } from '@/data/collections';
import { readDays } from '@/data/metrics';
import { read, readAll } from '@/data/read';

/**
 * A day still in progress is counted in nothing: a period is complete days, counted back from yesterday, and the day in
 * progress is handed over on its own for a chart to draw as running. And a read of all history is every row kept, not
 * the first page of it.
 */
const DAY = 86_400_000;
const today = clock().toISOString().slice(0, 10);
const back = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const OWNER = 'members_1';

beforeEach(() => { jar.value = OWNER; });

describe('the product keeps the day in progress beside its complete days', () => {
  it('as the last row of the days, the usage, the compute and the costs, with what has arrived by its clock', async () => {
    expect(today).toBe('2026-10-03');
    const [days, usage, compute, costs] = await Promise.all(['days', 'usage', 'compute', 'costs'].map(async (name) => (await readAll(name)).rows));
    const yesterday = days.find((d) => d.date === back(1))!, running = days.find((d) => d.date === today)!;
    expect(running, 'the days hold the day in progress').toBeTruthy();
    expect((running.requests as number) > 0 && (running.requests as number) < (yesterday.requests as number), `${running.requests} requests by 09:00 against ${yesterday.requests} the day before`).toBe(true);
    expect(usage.filter((u) => u.date === today)).toHaveLength(4);
    expect(sum(usage.filter((u) => u.date === today).map((u) => u.requests as number))).toBe(running.requests);
    expect(compute.filter((c) => c.date === today)).toHaveLength(4);
    for (const c of compute.filter((x) => x.date === today)) expect((c.used as number) <= (c.gpus as number) * 9, `${c.id}: ${c.used} GPU-hours used in nine hours of ${c.gpus} GPUs`).toBe(true);
    expect(costs.filter((c) => c.date === today)).toHaveLength(1);
  });
});

describe('a period is complete days, counted back from yesterday', () => {
  it.each([['7d', 7], ['30d', 30], ['90d', 90]] as const)('%s is the %i days up to yesterday, with the same number before them', async (period, n) => {
    const { series, previous, totals, running } = await readDays(period);
    expect(series.map((d) => d.date)).toEqual(Array.from({ length: n }, (_, i) => back(n - i)));
    expect(previous.map((d) => d.date)).toEqual(Array.from({ length: n }, (_, i) => back(2 * n - i)));
    expect(totals.current.requests).toBe(sum(series.map((d) => d.requests)));
    expect(Math.round(totals.current.revenue * 100)).toBe(sum(series.map((d) => Math.round(d.revenue * 100))));
    expect(totals.previous?.requests).toBe(sum(previous.map((d) => d.requests)));
    expect(running?.date).toBe(today);
  });

  it('all is every complete day kept, with nothing before it to compare with', async () => {
    const { series, previous, totals, running } = await readDays('all');
    expect(series).toHaveLength(360);
    expect([series[0].date, series[359].date]).toEqual([back(360), back(1)]);
    expect(previous).toEqual([]);
    expect(totals.previous).toBeNull();
    expect(totals.current.requests).toBe(sum(series.map((d) => d.requests)));
    expect(running?.date).toBe(today);
  });

  it('never counts the day in progress in a period, its total or the period before', async () => {
    for (const period of ['7d', '30d', '90d', 'all'] as const) {
      const { series, previous, totals, running } = await readDays(period);
      expect([...series, ...previous].map((d) => d.date), period).not.toContain(today);
      expect(running!.requests, period).toBeGreaterThan(0);
      expect(totals.current.requests, period).toBe(sum(series.map((d) => d.requests)));
    }
  });
});

describe('a read of all history is every row kept', () => {
  it('pages past the 500 rows one read returns, for the days, the usage, the compute and the costs', async () => {
    const one = await read('usage', { limit: 100_000 });
    expect(one.rows).toHaveLength(500);
    expect(one.total).toBe(361 * 4);
    for (const [name, total, key] of [['days', 361, 'date'], ['usage', 361 * 4, 'id'], ['compute', 361 * 4, 'id'], ['costs', 361, 'date']] as const) {
      const { rows } = await readAll(name);
      expect(rows, name).toHaveLength(total);
      expect(new Set(rows.map((r) => r[key])).size, `${name}: no row twice`).toBe(total);
    }
  });
});

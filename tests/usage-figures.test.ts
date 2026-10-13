// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const policy = vi.hoisted(() => ({ viewer: null as string[] | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// A Viewer holding exactly the grants a test names, where it names any.
vi.mock('@/data/roles', async (original) => {
  const actual = await original<typeof import('@/data/roles')>();
  return { ...actual, effective: (role: string, addOns: never) => (role === 'Viewer' && policy.viewer ? new Set(policy.viewer) : actual.effective(role as never, addOns)) };
});

import { usageFigures } from '@/data/usage';
import { collections } from '@/data/collections';
import { FEATURES } from '@/data/features';
import * as sample from '@/data/sample';

type Row = Record<string, unknown>;
const collection = (name: string) => collections.find((c) => c.name === name)!;
const all = async (name: string) => (await collection(name).query({})).rows as Row[];
const needs = [...(FEATURES.usage.needs as unknown as { allOf: readonly string[] }).allOf];
const kept = new Map<string, unknown>();
const stub = (name: string, rows: Row[]) => {
  const c = collection(name);
  kept.set(name, c.query);
  c.query = (async () => ({ rows, total: rows.length })) as never;
};

beforeEach(() => { jar.value = 'members_12'; policy.viewer = null; });
afterEach(() => { for (const [name, query] of kept) collection(name).query = query as never; kept.clear(); });

describe('when traffic comes and where it comes from', () => {
  it('are two collections, read like every other figure', () => {
    for (const name of ['hours', 'regions']) expect(collections.map((c) => c.name), name).toContain(name);
  });

  it('are drawn from what those reads answer: every weekday and hour, the hours of the day, and each region', async () => {
    const [hours, regions] = [await all('hours'), await all('regions')];
    expect(hours.length).toBe(7 * 24);
    const { heat, hours: byHour, regions: byRegion } = await usageFigures();
    for (const r of hours) expect(heat[r.weekday as number][r.hour as number], `${r.weekday}/${r.hour}`).toBe(r.requests);
    expect(byHour.map((h) => h.value)).toEqual(Array.from({ length: 24 }, (_, h) => hours.filter((r) => r.hour === h).reduce((n, r) => n + (r.requests as number), 0)));
    expect(byRegion.map((r) => [r.label, r.value, r.p50])).toEqual(regions.map((r) => [r.label, r.value, r.p50]));
  });

  it('change when the data does', async () => {
    stub('regions', [{ label: 'moon-1', value: 7, p50: 3 }]);
    expect((await usageFigures()).regions.map((r) => [r.label, r.value, r.p50])).toEqual([['moon-1', 7, 3]]);
  });
});

describe('who may see them', () => {
  it('is whoever holds the grants the page asks for, which name both collections', async () => {
    for (const grant of ['hours:read', 'regions:read']) expect(needs, grant).toContain(grant);
    policy.viewer = [...needs];
    expect((await usageFigures()).heat.length).toBe(7);
  });

  it('is nobody who lacks one of them', async () => {
    policy.viewer = needs.filter((g) => g !== 'hours:read');
    await expect(usageFigures()).rejects.toBeTruthy();
    policy.viewer = needs.filter((g) => g !== 'regions:read');
    await expect(usageFigures()).rejects.toBeTruthy();
  });
});

describe('what a page may import', () => {
  it('no longer includes the figures themselves: they are rows now', () => {
    for (const name of ['demoHeatmap', 'requestsByHour', 'REGION_LATENCY']) expect(Object.keys(sample), name).not.toContain(name);
  });
});

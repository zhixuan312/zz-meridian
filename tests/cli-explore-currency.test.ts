// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own prepared queries.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app.config', async (original) => {
  const actual = await original<typeof import('@/app.config')>();
  return { ...actual, app: { ...actual.app, currency: 'GBP' } };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { runExplore, type ExploreIO, type PreparedQuery } from '@/lib/explore';
import { homeExplore } from '@/logic/home-explore';
import { viewTools } from '@/logic/tools';

/**
 * In a project made with `--currency GBP`, Home's context says "£409,206.80"; `explore_home` must give the same figure
 * the same way, not "409,206.8 USD". No sample prepared query declares a currency as a measure's unit: money is
 * `money`, which the runner writes in `app.currency`.
 */
const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

describe("the sample's prepared queries write money in the product's currency", () => {
  it('declare no currency as a unit', () => {
    const units = viewTools.flatMap((v) => Object.entries((v.explore as PreparedQuery).sources).flatMap(([s, src]) =>
      Object.entries(src.measures).map(([name, d]) => [`explore_${v.name} ${s}.${name}`, d.unit] as const)));
    expect(units.length).toBeGreaterThan(20);
    expect(units.filter(([, u]) => CURRENCIES.has(u))).toEqual([]);
  });

  it("Home's revenue reads as its context writes it", async () => {
    const io: ExploreIO = {
      aggregate: async () => ({ total: { rows: 30, values: { revenue: 409_206.8 } }, groups: [], others: null }),
      read: async () => ({ rows: [], total: 0 }),
      today: '2026-10-13',
    };
    const { answer } = await runExplore(homeExplore as PreparedQuery, { source: 'days', measures: ['revenue'] }, { readable: new Set(['days']), hidden: () => [] }, io, '/');
    expect(answer).toContain('£409,206.80');
    expect(answer).not.toContain('409,206.8 USD');
  });
});

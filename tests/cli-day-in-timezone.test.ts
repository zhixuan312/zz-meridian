// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own days, which a product replaces.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// A product west of UTC: the sample's clock, 09:00 UTC on 3 October, is 23:00 on 2 October in Honolulu.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Pacific/Honolulu' } };
});

import { clock } from '@/data/collections';
import { readDays } from '@/data/metrics';
import { dayOf } from '@/lib/format-date';

/**
 * Today is the day in the reporting timezone wherever a day is cut (issue #42): the assistant's prompt, the prepared
 * query's `today` (`dayOf(clock())` in the assistant route) and the page's own periods are one day, so a `7d` window
 * ends on the product's yesterday, not the UTC one.
 */
describe("today is the product's day, not the UTC one", () => {
  it('the calendar day of an instant is the one in the timezone', () => {
    expect(dayOf('2026-10-16T17:00:00Z', 'Asia/Singapore')).toBe('2026-10-17');
    expect(dayOf('2026-10-16T17:00:00Z', 'UTC')).toBe('2026-10-16');
    expect(dayOf('2026-10-17T05:00:00Z', 'America/Los_Angeles')).toBe('2026-10-16');
    expect(dayOf('not a date', 'UTC')).toBe('');
    expect(clock().toISOString()).toBe('2026-10-03T09:00:00.000Z');
    expect(dayOf(clock())).toBe('2026-10-02');
  });

  it("a period of days ends on the product's yesterday, and the day in progress is the product's today", async () => {
    const { series, running } = await readDays('7d');
    expect(series.at(-1)?.date).toBe('2026-10-01');
    expect(series).toHaveLength(7);
    expect(running?.date).toBe('2026-10-02');
  });
});

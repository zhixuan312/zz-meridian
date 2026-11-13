// @vitest-environment node
// This file is the team's to rewrite when the sample is replaced.
// It shows one pattern: an expected value derived from the data, never typed in. The figure is computed over the data
// module's rows (here a sum), and the test asserts that the page's read returns the same value. When the data changes
// the expectation moves with it; when the read drifts from the data the test fails.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { clock, collections } from '@/data/collections';
import { dayOf } from '@/lib/format-date';
import { homeTool } from '@/logic/tools';

describe("Home's revenue over the last 30 complete days", () => {
  it('is the sum of the data module\'s daily revenue, as the page reads it', async () => {
    const days = collections.find((c) => c.name === 'days')!;
    const rows = (await days.query({})).rows as { date: string; revenue: number }[];
    // A day still in progress is in no period.
    const complete = rows.filter((d) => d.date < dayOf(clock())).slice(-30);
    const expected = complete.reduce((sum, d) => sum + d.revenue, 0);

    const { data } = await homeTool.read({ period: '30d' });
    expect(complete.length).toBe(30);
    expect(data.totals?.current.revenue).toBeCloseTo(expected, 2);
  });
});

// @vitest-environment node
// Named cli-* so the payload leaves it out: it holds src/data/read.ts, which a team owns and may rewrite.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { usage } from '@/data/collections';
import { readAll } from '@/data/read';

/**
 * Every row of a collection is read a page of 500 at a time, and the first page says how many there are. The pages
 * after it were asked one at a time, each after the last arrived, so a read of N pages waited N round trips: the
 * sample's usage and compute (1,444 rows each) cost Home three in a row, and a product with twenty models over a year
 * fifteen. Once the first page is in, the rest are known and are asked together.
 */
describe('readAll', () => {
  it('asks every page after the first at once', async () => {
    const query = usage.query.bind(usage);
    let inFlight = 0;
    let most = 0;
    let asked = 0;
    const spy = vi.spyOn(usage, 'query').mockImplementation(async (q) => {
      asked++;
      most = Math.max(most, ++inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return query(q);
    });
    try {
      const { rows } = await readAll('usage');
      const { total } = await query({ limit: 1 });
      expect(rows.length).toBe(total);
      expect(new Set(rows.map((r) => r.id)).size, 'every row once').toBe(total);
      const pages = Math.ceil(total / 500);
      expect(pages, 'the sample needs more than two pages for this to judge anything').toBeGreaterThan(2);
      expect(asked).toBe(pages);
      expect(most, `${pages} pages, asked ${most} at a time at most`).toBe(pages - 1);
    } finally {
      spy.mockRestore();
    }
  });
});

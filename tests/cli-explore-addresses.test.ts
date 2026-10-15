// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own people and pages.
import { afterEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { may } from '@/data/access';
import type { PreparedQuery } from '@/lib/explore';
import { viewTools } from '@/views/tools';

/**
 * What a prepared query says it cannot say sends the person only where they may go: every console address in a source's
 * `cannot` is a page whose view the person may open, for each of the sample's five people. A Viewer on Tickets is not
 * sent to Members for an assignee's name.
 */
const PEOPLE = { Owner: 'members_1', Admin: 'members_2', Member: 'members_4', 'Key manager': 'members_5', Viewer: 'members_12' };

afterEach(() => { jar.value = undefined; });

describe("a prepared query's cannot line", () => {
  for (const [who, id] of Object.entries(PEOPLE)) {
    it(`${who}: names only addresses they may open`, async () => {
      jar.value = id;
      const wrong: string[] = [];
      let seen = 0;
      for (const v of viewTools) {
        if (!(await may(v.needs))) continue;
        for (const [name, s] of Object.entries((v.explore as PreparedQuery).sources)) {
          for (const [, address] of s.cannot.matchAll(/\((\/[^)\s]*)\)/g)) {
            seen++;
            const page = viewTools.find((t) => t.page === address);
            if (!page) wrong.push(`view_${v.name}.${name} names ${address}, which is no page with a view`);
            else if (!(await may(page.needs))) wrong.push(`view_${v.name}.${name} sends ${who} to ${address}, which they may not open`);
          }
        }
      }
      // A floor, so a cannot line that stopped naming any page is a failure and not an empty loop.
      expect(seen, `${who} reads no address at all`).toBeGreaterThan(0);
      expect(wrong).toEqual([]);
    });
  }
});

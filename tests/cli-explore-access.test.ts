// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own people, pages and records.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { can, may, resolveAccess } from '@/data/access';
import { clock, collections, members } from '@/data/collections';
import { aggregate, read } from '@/data/read';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { homeExplore } from '@/views/home-explore';
import { viewTools } from '@/views/tools';

/**
 * A prepared query reads with exactly the page's rights (FR-40, AC-14.3): as each of the sample's five people, it offers no
 * source they may not read, and no filter, facet, measure or drill column of a field they may not read (compute cost and
 * gross margin for a Member and a Viewer, a `hidden` field for anyone); a call naming one anyway answers "You do not have
 * access to that."; and a person suspended after the tool was listed reads nothing.
 */
const PEOPLE = { Owner: 'members_1', Admin: 'members_2', Member: 'members_4', 'Key manager': 'members_5', Viewer: 'members_12' };
const io = (): ExploreIO => ({ aggregate, read: (name, q) => read(name, q), today: clock().toISOString().slice(0, 10) });
async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}
const HIDDEN = collections.flatMap((c) => ((c.hidden ?? []) as string[]).map((f) => `"${f}"`));

afterEach(async () => { jar.value = undefined; await members.update!(['members_4'], { status: 'Active' }); });

describe('a prepared query offers a person only what they may read', () => {
  for (const [who, id] of Object.entries(PEOPLE)) {
    it(`${who}: no source over a collection they may not read, no hidden field, and cost and margin only for an Owner or an Admin`, async () => {
      jar.value = id;
      const r = await rights();
      for (const v of viewTools) {
        if (!(await may(v.needs))) continue;
        const q = v.explore as PreparedQuery;
        const offered = Object.entries(q.sources).filter(([, s]) => r.readable.has(s.collection)).map(([n]) => n);
        if (!offered.length) continue;
        const own = v.page.includes('[') ? (v.input as z.ZodObject) : undefined;
        const schema = z.toJSONSchema(exploreSchema(q, r, own)) as unknown as { properties: { source: { enum: string[] } } };
        expect(schema.properties.source.enum.sort(), `view_${v.name}`).toEqual(offered.sort());
        const json = JSON.stringify(schema);
        for (const f of HIDDEN) expect(json, `view_${v.name} offers ${f}`).not.toContain(f);
        if (who === 'Member' || who === 'Viewer') {
          expect(json, `view_${v.name}`).not.toMatch(/grossMargin|"costs"/);
        }
      }
    });
  }

  it("answers a Member who names compute cost or gross margin anyway that they have no access, and reads nothing", async () => {
    jar.value = PEOPLE.Member;
    const spy = { aggregate: vi.fn(aggregate), read: vi.fn(read), today: io().today };
    for (const input of [{ source: 'costs', measures: [Object.keys(homeExplore.sources.costs.measures)[0]] }, { source: 'days', measures: ['grossMargin'] }]) {
      const { answer } = await runExplore(homeExplore as PreparedQuery, input, await rights(), spy, '/');
      expect(answer, JSON.stringify(input)).toBe('You do not have access to that.');
    }
    expect(spy.aggregate).not.toHaveBeenCalled();
  });

  it('reads nothing for a person suspended after the tool was listed', async () => {
    jar.value = PEOPLE.Member;
    const r = await rights();
    const call = { source: 'days', measures: ['revenue'] };
    expect((await runExplore(homeExplore as PreparedQuery, call, r, io(), '/')).answer).toMatch(/USD/);
    await members.update!(['members_4'], { status: 'Suspended' });
    await expect(runExplore(homeExplore as PreparedQuery, call, r, io(), '/')).rejects.toThrow();
  });
});

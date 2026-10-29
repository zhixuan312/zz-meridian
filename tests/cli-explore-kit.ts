// Named cli-* so the payload leaves it out with the tests that use it; not a test, so vitest does not collect it.
import { expect, it } from 'vitest';
import { z } from 'zod';
import { can, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { aggregate, read } from '@/data/read';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';

/** The product's own reads, dated by its clock: what the assistant route hands a prepared query. */
export const io = (): ExploreIO => ({ aggregate, read: (name, q) => read(name, q), today: clock().toISOString().slice(0, 10) });

/** The signed-in person's rights as the assistant route builds them: every collection they may read, less its hidden fields. */
export async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}

/** A prepared query's answer for the signed-in person, as the page at `page` hands it. */
export const ask = async (q: PreparedQuery<never>, input: Record<string, unknown>, page = '/') =>
  (await runExplore(q as PreparedQuery, input, await rights(), io(), page, z.object({}))).answer;

/** One case per query: declared in full, and every source's answer within the limits `docs/assistant.md` sets. */
export function holdsItsBounds(queries: Record<string, PreparedQuery<never>>) {
  for (const [name, q] of Object.entries(queries)) {
    it(`${name}: at most five sources, each with measures and a drill that names its rows' addresses, and every answer within 3,000 characters`, async () => {
      const sources = Object.entries(q.sources);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.length).toBeLessThanOrEqual(5);
      expect(JSON.stringify(z.toJSONSchema(exploreSchema(q as PreparedQuery, await rights()))).length).toBeLessThanOrEqual(6000);
      for (const [source, s] of sources) {
        const key = collections.find((c) => c.name === s.collection)!.key;
        expect(s.drill.columns, `${name}.${source}'s drill names the key`).toContain(key);
        const answer = await ask(q, { source, measures: [Object.keys(s.measures)[0]], rows: 20 });
        expect(answer.length, `${name}.${source}`).toBeLessThanOrEqual(3000);
        const drilled = answer.split('\n').filter((l) => /^- \/\S*: /.test(l));
        expect(drilled.length, `${name}.${source} drills with addresses`).toBeGreaterThan(0);
        expect(drilled.length).toBeLessThanOrEqual(20);
      }
    });
  }
}

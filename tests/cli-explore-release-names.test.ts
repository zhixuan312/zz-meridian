// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages' prepared queries of the sample's records.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { z } from 'zod';
import { can, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { read, aggregate } from '@/data/read';
import { runExplore, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { nowExplore } from '@/views/now-explore';
import { releasesExplore } from '@/views/releases-explore';
import { testsExplore } from '@/views/tests-explore';

/**
 * The runs Releases, Tests and Now count name each release by the version, service and environment the pages write
 * (AC-14.8's reading at review, D1): told only "releases_1: 1 failed", a model paired the keys with the page's versions
 * by position and sent the reader to the wrong release.
 */
async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}
const ask = async (q: PreparedQuery, input: Record<string, unknown>) =>
  (await runExplore(q, input, await rights(), { aggregate, read, today: clock().toISOString().slice(0, 10) }, '/', z.object({}))).answer;

describe('a run names its release', () => {
  it('on Releases, grouped by release and in the drilled rows', async () => {
    const answer = await ask(releasesExplore, { source: 'runs', measures: ['failed', 'runs'], by: 'releaseId', period: '30d', rows: 20 });
    expect(answer).toMatch(/^- releases_1 \(v4\.18\.2, Edge gateway, production\): 1 runs, 3 runs$/m);
    expect(answer).toContain('id tests_1, releaseId releases_1 (v4.18.2, Edge gateway, production), suite smoke');
    expect(answer.length).toBeLessThanOrEqual(3000);
  });

  it('on Tests and on Now', async () => {
    expect(await ask(testsExplore, { source: 'runs', measures: ['failed'], by: 'releaseId', period: '30d' })).toMatch(/^- releases_1 \(v4\.18\.2, Edge gateway, production\): 1 runs$/m);
    expect(await ask(nowExplore, { source: 'runs', measures: ['runs'], period: '30d', rows: 5 })).toMatch(/releaseId releases_\d+ \(v[\d.]+, [^,]+, (staging|production)\)/);
  });
});

// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages' prepared queries of the sample's records.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { collections } from '@/data/collections';
import { nowExplore } from '@/logic/now-explore';
import { releasesExplore } from '@/logic/releases-explore';
import { releaseRefers, testsExplore } from '@/logic/tests-explore';
import { ask } from './cli-explore-kit';

/**
 * The runs Releases, Tests and Now count name each release by the version, service and environment the pages write
 * (AC-14.8's reading at review, D1): told only "releases_1: 1 failed", a model paired the keys with the page's versions
 * by position and sent the reader to the wrong release.
 */

describe('a run names its release', () => {
  it('on Releases, grouped by release and in the drilled rows', async () => {
    const answer = await ask(releasesExplore, { source: 'runs', measures: ['failed', 'runs'], by: 'releaseId', period: '30d', rows: 20 });
    expect(answer).toMatch(/^- releases_1 \(v4\.18\.2, Edge gateway, production\): Failed 1 run, Runs 3 runs$/m);
    expect(answer).toContain('id tests_1, releaseId releases_1 (v4.18.2, Edge gateway, production), suite smoke');
    expect(answer.length).toBeLessThanOrEqual(3000);
  });

  it("reads the releases by the collection's own key", () => {
    expect(releaseRefers.releaseId.key).toBe(collections.find((c) => c.name === 'releases')!.key);
  });

  it('on Tests and on Now', async () => {
    expect(await ask(testsExplore, { source: 'runs', measures: ['failed'], by: 'releaseId', period: '30d' })).toMatch(/^- releases_1 \(v4\.18\.2, Edge gateway, production\): 1 run$/m);
    expect(await ask(nowExplore, { source: 'runs', measures: ['runs'], period: '30d', rows: 5 })).toMatch(/releaseId releases_\d+ \(v[\d.]+, [^,]+, (staging|production)\)/);
  });
});

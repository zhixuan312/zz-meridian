// @vitest-environment node
// This repository's rail and its navigation checks name the same routes: a new page cannot ship unchecked. The navigation
// suite reports a route it has no check for as not configured, and exits 2 so that is never counted as passed — right for
// an adopted project whose rail is not the template's, and red here, where this test holds the coverage (run 42659606501:
// an adopted project's own test:t2 failed every route with `never-ready: the rail has no other route to start from`).
import { describe, expect, it } from 'vitest';
import { prefetchJudged, resolveCoverage, unconfiguredRoutes } from '../scripts/lib/coverage.ts';
import { railRoutes } from '../scripts/lib/routes.ts';
import { prefetchProblems } from '../scripts/lib/sizes.ts';
import config from '../scripts/verify.config.ts';

describe("this repository's navigation coverage", () => {
  it('configures a check for every rail route, and a check for nothing but a rail route', async () => {
    const rail = await railRoutes();
    const coverage = resolveCoverage('full', rail.routes, config.navigationChecks ?? [], rail.routes);
    expect(coverage.errors).toEqual([]);
    expect(coverage.routes.filter((r) => r.data !== 'configured').map((r) => r.path)).toEqual([]);
  });
});

describe('the routes a project has configured no check for', () => {
  it('names every rail route when it configures none, only the missing ones when it configures some', () => {
    expect(unconfiguredRoutes(['/', '/orders'], [])).toEqual(['/', '/orders']);
    expect(unconfiguredRoutes(['/', '/orders', '/members'], [{ path: '/' }])).toEqual(['/orders', '/members']);
    expect(unconfiguredRoutes(['/', '/orders'], [{ path: '/' }, { path: '/orders' }])).toEqual([]);
  });

  it('leaves this repository with none, so the 20-sample protocol samples every rail route exactly as before', async () => {
    const rail = await railRoutes();
    expect(unconfiguredRoutes(rail.routes, config.navigationChecks ?? [])).toEqual([]);
  });
});

describe('a prefetch budget a project has not promised', () => {
  it('judges the desktop cap always, and the phone-closed cap only where the rail is in a drawer on a phone', () => {
    expect(prefetchJudged('desktop', [])).toEqual({ judged: true });
    expect(prefetchJudged('phoneClosed', ['/', '/members'])).toEqual({ judged: true });
    expect(prefetchJudged('phoneClosed', [])).toEqual({ judged: false, reason: "the project's rail is not in a drawer on a phone" });
  });

  it('leaves an unjudged phone-closed figure out of the problems rather than counting it as a pass', () => {
    const caps = { desktop: 80, phoneClosed: 0 };
    expect(prefetchProblems({ desktopBytes: 0, phoneClosedBytes: 2 * 1024 }, caps)).toEqual(['phone with the drawer closed: prefetch 2 KiB over its 0 KiB cap']);
    expect(prefetchProblems({ desktopBytes: 0, phoneClosedBytes: 2 * 1024 }, caps, { phoneClosed: false })).toEqual([]);
  });
});

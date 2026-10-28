// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { firstLoad, firstLoadProblems, htmlGrowthProblems, htmlProblems, htmlRoutes, isPrefetch, prefetchProblems } from '../scripts/lib/sizes.ts';
import { DEFAULT_BUDGETS, budgetsOf } from '../scripts/lib/budgets.ts';

const KiB = 1024;
const sizes: Record<string, number> = { a: 300 * KiB, b: 200 * KiB, c: 400 * KiB };

describe('first-load JS', () => {
  it('counts each chunk once per route', () => {
    const routes = firstLoad([{ route: '/x', firstLoadChunkPaths: ['a', 'b', 'a'] }], (c) => sizes[c] ?? null);
    expect(routes).toEqual([{ route: '/x', bytes: 500 * KiB }]);
  });
  it('fails a missing diagnostic instead of counting it as zero', () => {
    expect(() => firstLoad([{ route: '/x', firstLoadChunkPaths: ['a', 'missing'] }], (c) => sizes[c] ?? null)).toThrow(/missing/);
  });
  it('names a route over the cap or past its growth allowance, and says when growth has no baseline', () => {
    const routes = [{ route: '/x', bytes: 900 * KiB }, { route: '/y', bytes: 535 * KiB }];
    const capped = firstLoadProblems(routes, { capKiB: 820, growthPct: 5, baseline: { '/x': 880 * KiB, '/y': 500 * KiB } });
    expect(capped.growth).toBe('checked');
    expect(capped.problems).toEqual(expect.arrayContaining([expect.stringMatching(/^\/x: first-load JS 900 KiB over the 820 KiB cap/), expect.stringMatching(/^\/y: first-load JS grew 7\.0% over its baseline \(cap 5%\)/)]));
    expect(firstLoadProblems([{ route: '/y', bytes: 535 * KiB }], { capKiB: 820, growthPct: 5, baseline: null })).toEqual({ problems: [], growth: 'not-configured' });
    expect(firstLoadProblems([{ route: '/y', bytes: 535 * KiB }], { capKiB: 1, growthPct: 5, baseline: null }).problems).toHaveLength(1);
  });
  it('with the cap for unheld routes only, holds a route the baseline holds to its baseline alone (#76)', () => {
    const routes = [{ route: '/x', bytes: 852 * KiB }, { route: '/y', bytes: 900 * KiB }, { route: '/z', bytes: 700 * KiB }];
    const got = firstLoadProblems(routes, { capKiB: 820, growthPct: 5, baseline: { '/x': 850 * KiB, '/z': 600 * KiB }, capUnheldOnly: true });
    expect(got.problems).toEqual(['/y: first-load JS 900 KiB over the 820 KiB cap', '/z: first-load JS grew 16.7% over its baseline (cap 5%)']);
    expect(budgetsOf({ budgets: { firstLoadKb: null } }).firstLoadKb).toBeNull();
    expect(budgetsOf({}).firstLoadKb).toBe(830);
  });
});

describe('HTML and prefetch', () => {
  it('names a page over its HTML cap', () => {
    expect(htmlProblems({ '/services': 131 * KiB, '/requests': 70 * KiB }, { '/services': 100, '/requests': 80 })).toEqual(['/services: HTML 131 KiB over its 100 KiB cap']);
  });
  it('holds each page\'s HTML to its own baseline, and says when there is none (#57)', () => {
    const baseline = { '/services': 20 * KiB, '/requests': 30 * KiB };
    const grown = htmlGrowthProblems({ '/services': 21.5 * KiB, '/requests': 30 * KiB }, { growthPct: 5, baseline });
    expect(grown).toEqual({ growth: 'checked', problems: ['/services: HTML grew 7.5% over its baseline (cap 5%)'] });
    expect(htmlGrowthProblems({ '/services': 21 * KiB }, { growthPct: 5, baseline: null })).toEqual({ growth: 'not-configured', problems: [] });
  });
  it('measures the pages a person opens: no API, no dynamic segment, no not-found', () => {
    expect(htmlRoutes(['/', '/_not-found', '/api/live', '/customers', '/customers/[id]', '/system/[...slug]'])).toEqual(['/', '/customers']);
  });
  it('tells a prefetch from a page request, and checks both device caps', () => {
    expect(isPrefetch({ headers: { 'next-router-prefetch': '1', rsc: '1' } })).toBe(true);
    expect(isPrefetch({ headers: { rsc: '1' } })).toBe(false);
    expect(prefetchProblems({ desktopBytes: 90 * KiB, phoneClosedBytes: 2 * KiB }, { desktop: 80, phoneClosed: 0 })).toHaveLength(2);
    expect(prefetchProblems({ desktopBytes: 60 * KiB, phoneClosedBytes: 0 }, { desktop: 80, phoneClosed: 0 })).toEqual([]);
  });
});

describe('the budgets', () => {
  it('default to the spec, after-live to cold, and take a partial override', () => {
    expect(DEFAULT_BUDGETS.navigation.warm.shellMs).toEqual({ desktop: 150, phone: 250 });
    expect(DEFAULT_BUDGETS.navigation.cold.interactiveMs).toEqual({ desktop: 2000, phone: 4000 });
    expect(DEFAULT_BUDGETS.navigation.afterLive).toEqual(DEFAULT_BUDGETS.navigation.cold);
    expect(DEFAULT_BUDGETS).toMatchObject({ firstLoadKb: 830, firstLoadGrowthPct: 5, htmlGrowthPct: 5, prefetchKb: { desktop: 80, phoneClosed: 0 } });
    const b = budgetsOf({ budgets: { firstLoadKb: 900, navigation: { cold: { ...DEFAULT_BUDGETS.navigation.cold, shellMs: { desktop: 700, phone: 1600 } } } } });
    expect(b.firstLoadKb).toBe(900);
    expect(b.navigation.afterLive.shellMs).toEqual({ desktop: 700, phone: 1600 });
    expect(b.navigation.warm).toEqual(DEFAULT_BUDGETS.navigation.warm);
    expect(budgetsOf({})).toEqual(DEFAULT_BUDGETS);
  });
});

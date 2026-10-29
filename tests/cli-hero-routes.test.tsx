// Named cli-* so the payload leaves it out: it is about the sample's own front door.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/system/hero';
import { ENDPOINTS, busiestRoutes, demoSeries } from '@/system/fixtures/company';
import { formatCompact } from '@/lib/format';

const series = demoSeries('30d').current;
window.matchMedia ??= ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;

/**
 * The front door's console lists the three busiest routes for the day it reads. It drew them from shares typed into the
 * hero (44%, 29%, 18%), beside figures from the sample, so the front door disagreed with the Usage page's endpoint list
 * over the same 30 days (40.8%, 26.8%, 16.8%).
 */
describe('the front door’s routes', () => {
  it('are each the share the endpoints divide the requests by', () => {
    const routes = busiestRoutes(3);
    const served = ENDPOINTS.reduce((n, e) => n + e.requests, 0);
    expect(routes.map((r) => r.share)).toEqual([...ENDPOINTS].sort((a, b) => b.requests - a.requests).slice(0, 3).map((e) => e.requests / served));
    render(<Hero series={series} routes={routes} />);
    const day = series.at(-1)!;
    for (const { route, share } of routes) {
      const row = screen.getByText(route).parentElement!;
      expect(row.textContent).toBe(`${route}${formatCompact(Math.round(day.requests * share))}`);
    }
  });
});

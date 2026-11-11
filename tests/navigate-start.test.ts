// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { redirectedEverywhere, startFor } from '../scripts/lib/journey.ts';

// A product whose rail shows the part of the navigation the page belongs to: three parts, of three, two and one routes.
const order = ['/', '/members', '/settings', '/usage', '/customers', '/services'];
const part = (routes: string[]) => Object.fromEntries(routes.map((r) => [r, routes]));
const drawn: Record<string, string[]> = { ...part(['/', '/members', '/settings']), ...part(['/usage', '/customers']), ...part(['/services']) };

describe('where a journey to a destination starts', () => {
  it('is the route before it when that route\'s rail links to it', () => {
    expect(startFor(order, '/members', order, drawn)).toBe('/');
    expect(startFor(order, '/settings', order, drawn)).toBe('/members');
    expect(startFor(order, '/customers', order, drawn)).toBe('/usage');
  });

  it('passes over the routes whose rail does not link to it, to the nearest that does', () => {
    // Everything before Usage shows another part of the navigation; the route after it shows its own.
    expect(startFor(order, '/usage', order, drawn)).toBe('/customers');
    expect(startFor(order, '/', order, drawn)).toBe('/members');
  });

  it('is nowhere when no other route\'s rail links to it, or none that links to it may start a journey', () => {
    expect(startFor(order, '/services', order, drawn)).toBeUndefined();
    expect(startFor(order, '/usage', ['/', '/members', '/settings', '/usage'], drawn)).toBeUndefined();
  });

  it('is exactly what it was for a rail nothing is known of: the route before, or the one after for the first', () => {
    expect(startFor(order, '/usage', order)).toBe('/settings');
    expect(startFor(order, '/', order)).toBe('/members');
    expect(startFor(order, '/usage', ['/', '/customers'])).toBe('/');
    expect(startFor(['/only'], '/only')).toBeUndefined();
  });

  it('is unchanged for a rail that shows every route on every page', () => {
    const all = part(order);
    for (const route of order) expect(startFor(order, route, order, all), route).toBe(startFor(order, route, order));
  });
});

// A build behind sign-in answers every rail route with the sign-in page. The sweep must name that wall, not send every
// route to `never-ready: the rail has no other route to start from` (issue #142).
describe('every rail route answered by one page outside the console', () => {
  const routes = ['/', '/usage', '/requests'];
  it('names the path when every route landed there', () => {
    expect(redirectedEverywhere(routes, { '/': '/sign-in', '/usage': '/sign-in', '/requests': '/sign-in' })).toBe('/sign-in');
  });
  it('treats a trailing slash as the same path', () => {
    expect(redirectedEverywhere(['/usage'], { '/usage': '/usage/' })).toBeNull();
    expect(redirectedEverywhere(routes, { '/': '/sign-in/', '/usage': '/sign-in', '/requests': '/sign-in' })).toBe('/sign-in');
  });
  it('stays silent when one route was answered where it was asked, or they landed apart', () => {
    expect(redirectedEverywhere(routes, { '/': '/sign-in', '/usage': '/usage', '/requests': '/sign-in' })).toBeNull();
    expect(redirectedEverywhere(routes, { '/': '/sign-in', '/usage': '/404', '/requests': '/sign-in' })).toBeNull();
    expect(redirectedEverywhere(routes, { '/': '/sign-in', '/usage': undefined, '/requests': '/sign-in' })).toBeNull();
  });
});

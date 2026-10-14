// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { journeyStart, startFor } from '../scripts/navigate.ts';

// A product whose rail shows the part of the navigation the page belongs to: three workspaces of three, two and one
// routes. The workspace menu opens each workspace's home, so a home no other rail links to is still reached: from a page
// of another workspace, through the menu (issue #31).
const order = ['/', '/members', '/settings', '/usage', '/customers', '/services'];
const part = (routes: string[]) => Object.fromEntries(routes.map((r) => [r, routes]));
const drawn: Record<string, string[]> = { ...part(['/', '/members', '/settings']), ...part(['/usage', '/customers']), ...part(['/services']) };
const homes = ['/', '/usage', '/services'];

describe('where a journey to a destination starts, and how it gets there', () => {
  it('through the rail wherever a rail links to it, from where startFor says', () => {
    for (const route of ['/', '/members', '/settings', '/usage', '/customers']) {
      expect(journeyStart(order, route, order, drawn, homes), route).toEqual({ from: startFor(order, route, order, drawn), via: 'rail' });
    }
  });

  it('through the workspace menu for a home no other rail links to, from the nearest route before it that may start one', () => {
    expect(journeyStart(order, '/services', order, drawn, homes)).toEqual({ from: '/customers', via: 'menu' });
    expect(journeyStart(order, '/services', ['/', '/members'], drawn, homes)).toEqual({ from: '/members', via: 'menu' });
  });

  it('for the first route of the order, from the route after it', () => {
    const first = ['/services', '/', '/members'];
    const rails = { ...part(['/', '/members']), ...part(['/services']) };
    expect(journeyStart(first, '/services', first, rails, ['/services', '/'])).toEqual({ from: '/', via: 'menu' });
  });

  it('nowhere for a route that is not a home and no rail links to, or with no other route to start from', () => {
    expect(journeyStart(order, '/services', order, drawn, ['/', '/usage'])).toBeUndefined();
    expect(journeyStart(['/only'], '/only', ['/only'], { '/only': ['/only'] }, ['/only'])).toBeUndefined();
  });
});

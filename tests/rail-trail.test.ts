// @vitest-environment node
import { Home } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { NavGroup } from '@/app.config';
import { entryFor, navTrail } from '@/components/patterns/rail/trail';

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const item = (href: string, label: string, extra: Record<string, unknown> = {}) => ({ href, label, icon: Home, needs: 'public', ...extra }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [
  { items: [item('/', 'Overview')] },
  { label: 'Traffic', items: [item('/load', 'Load'), item('/calls', 'Calls', { under: '/load' })] },
  { label: 'Elsewhere', items: [item('/stray', 'Stray', { under: '/load' })] },
  { label: 'Loose', items: [item('/top', 'Top', { under: '/gone' }), item('/leaf', 'Leaf', { under: '/top' })] },
];

describe('the trail from the top of the navigation to a page', () => {
  it('is the parent, a link, then the sub page, the current crumb with no link', () => {
    expect(navTrail('/calls', NAV)).toEqual([{ label: 'Load', href: '/load' }, { label: 'Calls' }]);
  });

  it('is the item alone for an item with no parent', () => {
    expect(navTrail('/load', NAV)).toEqual([{ label: 'Load' }]);
    expect(navTrail('/', NAV)).toEqual([{ label: 'Overview' }]);
  });

  it('is the item alone when the parent it names is not an item of its group', () => {
    expect(navTrail('/stray', NAV)).toEqual([{ label: 'Stray' }]);
  });

  it('takes a parent whose own under names no item of its group, as the rail draws it', () => {
    expect(navTrail('/leaf', NAV)).toEqual([{ label: 'Top', href: '/top' }, { label: 'Leaf' }]);
    expect(navTrail('/top', NAV)).toEqual([{ label: 'Top' }]);
  });

  it('is empty for an address no item declares', () => {
    expect(navTrail('/nowhere', NAV)).toEqual([]);
    expect(navTrail('/calls/42', NAV)).toEqual([]);
  });
});

describe('the entry an address falls under', () => {
  const items = ['/', '/requests', '/requests/archive', '/keys'].map((href) => ({ href }));
  const at = (path: string) => entryFor(path, items)?.href;
  it('is the longest entry it equals or continues on a whole segment', () => {
    expect(at('/requests/req_1')).toBe('/requests');
    expect(at('/requests/archive/2026')).toBe('/requests/archive');
    expect(at('/requests-archive')).toBeUndefined();
    expect(at('/keys/')).toBe('/keys');
  });
  it('lets the home claim only itself', () => {
    expect(at('/')).toBe('/');
    expect(at('/nothing')).toBeUndefined();
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Activity, BarChart3, Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import type { NavGroup } from '@/app.config';

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const items = (under?: string): NavGroup[] => [{
  label: 'Traffic',
  items: [
    { href: '/', label: 'Home', icon: Home, needs: 'public' },
    { href: '/usage', label: 'Usage', icon: BarChart3, needs: 'public' },
    { href: '/requests', label: 'Requests', icon: Activity, needs: 'public', ...(under ? { under } : {}) },
  ],
}];
const link = (href: string) => document.querySelector<HTMLAnchorElement>(`nav[aria-label="Main"] a[href="${href}"]`)!;
/** The list a link sits in, and whether that list is itself inside another list. */
const nested = (href: string) => link(href).closest('ul')!.parentElement!.closest('ul') !== null;

describe('the rail with a third level: the branch drawn', () => {
  it('draws a navigation with no under as one list per group, every link at the second level with its icon', () => {
    render(<Rail nav={items()} user={null} />);
    for (const href of ['/', '/usage', '/requests']) {
      expect(nested(href), href).toBe(false);
      expect(link(href).querySelector('svg'), href).not.toBeNull();
    }
  });

  it('draws a sub page in a list nested inside its parent\'s item, with no icon', () => {
    render(<Rail nav={items('/usage')} user={null} />);
    const parent = link('/usage').closest('li')!;
    expect(parent.contains(link('/requests'))).toBe(true);
    expect(nested('/requests')).toBe(true);
    expect(nested('/usage')).toBe(false);
    expect(link('/requests').querySelector('svg')).toBeNull();
    expect(link('/usage')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves an item whose under names no held item of its group at the top level, with its icon', () => {
    render(<Rail nav={items('/nowhere')} user={null} />);
    expect(nested('/requests')).toBe(false);
    expect(link('/requests').querySelector('svg')).not.toBeNull();
  });
});

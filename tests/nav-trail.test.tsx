import { render } from '@testing-library/react';
import { Home } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavGroup } from '@/app.config';

const at = vi.hoisted(() => ({ path: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => at.path }));

import { NavTrail } from '@/components/patterns/rail/nav-trail';

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const item = (href: string, label: string, extra: Record<string, unknown> = {}) => ({ href, label, icon: Home, needs: 'public', ...extra }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [{ label: 'Traffic', items: [item('/load', 'Load'), item('/calls', 'Calls', { under: '/load' })] }];
const crumbs = (path: string) => {
  at.path = path;
  const { container, unmount } = render(<NavTrail nav={NAV} />);
  const out = [...container.querySelectorAll('li:not([aria-hidden])')].map((li) => ({ text: li.textContent?.trim(), href: li.querySelector('a')?.getAttribute('href') ?? null }));
  unmount();
  return out;
};

beforeEach(() => { at.path = '/'; });

describe("a sub page's trail, read from the address", () => {
  it('is the parent, a link, then the page, on the sub page and on any address under it', () => {
    expect(crumbs('/calls')).toEqual([{ text: 'Load', href: '/load' }, { text: 'Calls', href: null }]);
    expect(crumbs('/calls/c_1')).toEqual([{ text: 'Load', href: '/load' }, { text: 'Calls', href: null }]);
  });

  it('draws nothing on a page with no parent, or an address no item claims', () => {
    expect(crumbs('/load')).toEqual([]);
    expect(crumbs('/elsewhere')).toEqual([]);
  });
});

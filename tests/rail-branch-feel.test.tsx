import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/usage' }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Activity, BarChart3, Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import type { NavGroup } from '@/app.config';

type Item = NavGroup['items'][number];
const item = (href: string, label: string, icon: Item['icon'], under?: string): Item => ({ href, label, icon, needs: 'public', ...(under ? { under } : {}) });

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const NAV: NavGroup[] = [
  { items: [item('/', 'Home', Home)] },
  { label: 'Traffic', items: [item('/usage', 'Usage', BarChart3), item('/requests', 'Requests', Activity, '/usage')] },
];
const rail = (p: string) => { at.path = p; return render(<Rail nav={NAV} user={null} />); };
const toggle = () => screen.getByRole('button', { name: 'Usage pages' });

describe('the branch button: focus that stays', () => {
  it('keeps focus on the button after it closes and after it opens the branch', () => {
    rail('/usage');
    const button = toggle();
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});


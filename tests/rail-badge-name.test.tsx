import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The rail reads the router to know which destination is current; a test states it.
vi.mock('next/navigation', () => ({
  usePathname: () => '/services',
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Activity, Gauge, Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import type { NavGroup } from '@/app.config';

type Item = NavGroup['items'][number];
const item = (href: string, label: string, icon: Item['icon'], badge?: string): Item => ({ href, label, icon, needs: 'public', ...(badge ? { badge } : {}) });

/**
 * A count badge is a number with no word of its own: clipped from its row, or read on its own, "3" says nothing about
 * what it counts (#130). A navigation of this test's own, so a created project that edits its rail keeps this green.
 */
const tree = (badge?: string): NavGroup[] => [
  { items: [item('/', 'Home', Home), item('/services', 'Services', Gauge, badge), item('/requests', 'Requests', Activity)] },
];

describe('a navigation count badge', () => {
  it('names the destination it counts, so the number reads on its own', () => {
    render(<Rail nav={tree('3')} current="/services" user={null} />);
    const badge = screen.getByRole('img', { name: 'Services: 3 new' });
    expect(badge).toHaveTextContent('3');
    expect(badge).toHaveAttribute('title', 'Services: 3 new');
  });

  it('leaves a destination with no count with no badge at all', () => {
    render(<Rail nav={tree()} current="/services" user={null} />);
    expect(screen.queryByRole('img', { name: / new$/ })).toBeNull();
  });
});

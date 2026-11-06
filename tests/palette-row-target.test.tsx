import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Home } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { CommandPalette } from '@/components/patterns/command-palette';

const item = (href: string, label: string) => ({ href, label, icon: Home, needs: 'public' }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [{ items: [item('/', 'Overview')] }];

/**
 * Every control answers 44px under a finger (`docs/surfaces.md`). The menu's own rows take `pointer-coarse:h-11`;
 * the palette's were fixed at `h-10`, 40px on a phone, and no audit saw it because the palette is closed on a page.
 */
describe('a palette result row', () => {
  it('grows to a 44px touch target on a coarse pointer, and stays 40px with a mouse', () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    const row = screen.getAllByRole('option')[0];
    expect(row.className).toContain('h-10');
    expect(row.className).toContain('pointer-coarse:h-11');
  });
});

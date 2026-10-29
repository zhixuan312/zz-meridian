import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Home } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { CommandPalette } from '@/components/patterns/command-palette';

const item = (href: string, label: string) => ({ href, label, icon: Home, needs: 'public' }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [{ items: [item('/', 'Overview'), item('/load', 'Load')] }];

const open = () => {
  render(<CommandPalette nav={NAV} />);
  act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
  return screen.getByRole('dialog');
};

// An input method (Chinese, Japanese, Korean) composes with these keys: Enter accepts the text, Escape cancels it, the
// arrows pick a candidate. None of them is the palette's while a composition is open.
describe('the palette, while an input method composes', () => {
  it('runs nothing on the Enter that accepts the composition', () => {
    const panel = open();
    fireEvent.keyDown(panel, { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('does not move the highlight on the arrows that pick a candidate', () => {
    const panel = open();
    const selected = () => screen.getAllByRole('option').findIndex((o) => o.getAttribute('aria-selected') === 'true');
    const before = selected();
    fireEvent.keyDown(panel, { key: 'ArrowDown', isComposing: true, keyCode: 229 });
    expect(selected()).toBe(before);
  });

  it('stays open on the Escape that cancels the composition', () => {
    const panel = open();
    fireEvent.keyDown(panel, { key: 'Escape', isComposing: true, keyCode: 229 });
    expect(screen.queryByRole('dialog')).toBeTruthy();
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Activity, BarChart3, Home } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { CommandPalette } from '@/components/patterns/command-palette';

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const item = (href: string, label: string, extra: Record<string, unknown> = {}) => ({ href, label, icon: Home, needs: 'public', ...extra }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [
  { items: [item('/', 'Overview')] },
  { label: 'Traffic', items: [item('/load', 'Load', { icon: BarChart3 }), item('/calls', 'Calls', { icon: Activity, under: '/load' })] },
  { label: 'Elsewhere', items: [item('/stray', 'Stray', { under: '/load' })] },
  { label: 'Loose', items: [item('/top', 'Top', { under: '/gone' }), item('/leaf', 'Leaf', { under: '/top' })] },
];

const hint = (label: string) => {
  const option = screen.getAllByRole('option').find((o) => o.querySelector(`[title="${label}"]`));
  if (!option) throw new Error(`no option for ${label}`);
  return option.querySelector('span.text-xs')?.textContent ?? '';
};

describe("the palette's hint for a destination", () => {
  it("names a sub page's parent, and every other destination's group", () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    expect(hint('Calls')).toBe('Load');
    expect(hint('Load')).toBe('Traffic');
    expect(hint('Overview')).toBe('');
  });

  it('keeps the group as the hint when the parent the item names is not an item of its group', () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    expect(hint('Stray')).toBe('Elsewhere');
  });

  it('names a parent whose own under names no item of its group, as the rail draws it', () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    expect(hint('Leaf')).toBe('Top');
    expect(hint('Top')).toBe('Loose');
  });

  it("finds a sub page by its parent's label", () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'load' } });
    const shown = screen.getAllByRole('option').map((o) => o.querySelector('[title]')?.getAttribute('title'));
    expect(shown).toEqual(['Load', 'Calls']);
  });
});

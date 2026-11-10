import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Home } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { CommandPalette } from '@/components/patterns/command-palette';

const item = (href: string, label: string) => ({ href, label, icon: Home, needs: 'public' }) as unknown as NavGroup['items'][number];
const NAV: NavGroup[] = [{ items: [item('/reload', 'Reload'), item('/payload', 'Payload'), item('/load', 'Load')] }];

/** The palette filters through `rank` (src/lib/rank.ts), the same function the Combobox uses: the order a person sees
 *  while typing is the same in both. */
describe('the palette ranks through the shared filter', () => {
  it('puts a label that starts with the query first, then by where the match starts', () => {
    render(<CommandPalette nav={NAV} />);
    act(() => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'load' } });
    const labels = screen.getAllByRole('option').map((o) => o.textContent);
    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain('Load');
    expect(labels[1]).toContain('Reload');
    expect(labels[2]).toContain('Payload');
  });
});

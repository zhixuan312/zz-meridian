import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nav } from '@/app.config';
import type { ChromeAccess } from '@/lib/collection';
import { ConsoleRail, visible } from '@/views/console-chrome';

describe("the console's rail, configured from the product's layout", () => {
  it('shows every destination by default, and only those a person may see when given', () => {
    expect(visible()).toBe(nav);
    const only = visible(['/', '/members']);
    expect(only.flatMap((g) => g.items.map((i) => i.href))).toEqual(['/', '/members']);
    expect(only.every((g) => g.items.length)).toBe(true);
  });
  it('shows the frame with no destination and no name until access resolves, then the person and their role', async () => {
    let settle!: (access: ChromeAccess | null) => void;
    const access = new Promise<ChromeAccess | null>((resolve) => { settle = resolve; });
    await act(async () => { render(<ConsoleRail signOut={null} access={access} />); });
    // The rail is never drawn with a name or a link it would then take away.
    expect(screen.queryByText('Shop team')).toBeNull();
    expect(screen.queryByRole('link', { name: /Overview/ })).toBeNull();
    await act(async () => { settle({ only: ['/'], user: { name: 'Shop team', role: 'No sign-in' }, viewAs: { current: 'members_1', options: [], choose: async () => {} } }); });
    expect(await screen.findByText('Shop team')).toBeTruthy();
    expect(screen.getByText('No sign-in')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Members' })).toBeNull();
    expect(screen.getByRole('link', { name: /Overview/ })).toBeTruthy();
  });

  it('keeps the placeholder and every destination away when the identity cannot be resolved', async () => {
    await act(async () => { render(<ConsoleRail signOut={null} access={Promise.resolve(null)} />); });
    expect(await screen.findByRole('link', { name: /Settings/ }).catch(() => null)).toBeNull();
    // The sample person is not whose dashboard this is, so nothing of theirs is drawn either.
    expect(screen.queryByText('Maya Chen')).toBeNull();
  });
});

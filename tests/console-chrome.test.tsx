import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nav } from '@/app.config';
import type { ChromeAccess } from '@/lib/collection';
import { ConsoleRail } from '@/views/console-chrome';

describe("the console's rail, configured from the product's layout", () => {
  // The configured navigation, whatever the product calls its pages: its first destination and one other, when it has one.
  const [first, other] = nav.flatMap((g) => g.items);

  it('shows the frame with no destination and no name until access resolves, then the person and their role', async () => {
    let settle!: (access: ChromeAccess | null) => void;
    const access = new Promise<ChromeAccess | null>((resolve) => { settle = resolve; });
    await act(async () => { render(<ConsoleRail signOut={null} access={access} />); });
    // The rail is never drawn with a name or a link it would then take away.
    expect(screen.queryByText('Shop team')).toBeNull();
    expect(screen.queryByRole('link', { name: first!.label })).toBeNull();
    await act(async () => { settle({ only: [first!.href], user: { name: 'Shop team', role: 'No sign-in' }, viewAs: { current: 'members_1', options: [], choose: async () => {} } }); });
    expect(await screen.findByText('Shop team')).toBeTruthy();
    expect(screen.getByText('No sign-in')).toBeTruthy();
    expect(screen.getByRole('link', { name: first!.label })).toBeTruthy();
    if (other) expect(screen.queryByRole('link', { name: other.label })).toBeNull();
  });

  it('keeps the placeholder and every destination away when the identity cannot be resolved', async () => {
    await act(async () => { render(<ConsoleRail signOut={null} access={Promise.resolve(null)} />); });
    await act(async () => { await Promise.resolve(); });
    const labels = nav.flatMap((g) => g.items.map((i) => i.label));
    // An absence is read once the access has settled; waiting for a link that never comes took the five-second timeout.
    expect(screen.queryAllByRole('link').filter((l) => labels.some((x) => l.textContent?.includes(x)))).toEqual([]);
    // The sample person is not whose dashboard this is, so nothing of theirs is drawn either.
    expect(screen.queryByText('Maya Chen')).toBeNull();
  });
});

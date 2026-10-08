import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nav } from '@/app.config';
import { ConsoleRail, visible } from '@/views/console-chrome';

describe("the console's rail, configured from the product's layout", () => {
  it('shows every destination by default, and only those a person may see when given', () => {
    expect(visible()).toBe(nav);
    const only = visible(['/', '/members']);
    expect(only.flatMap((g) => g.items.map((i) => i.href))).toEqual(['/', '/members']);
    expect(only.every((g) => g.items.length)).toBe(true);
  });
  it('takes the signed-in person and no Sign out, for a console without sign-in', () => {
    render(<ConsoleRail user={{ name: 'Shop team', role: 'No sign-in' }} signOut={null} only={['/']} />);
    expect(screen.getByText('Shop team')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Members' })).toBeNull();
    expect(screen.getByRole('link', { name: /Overview/ })).toBeTruthy();
  });
});

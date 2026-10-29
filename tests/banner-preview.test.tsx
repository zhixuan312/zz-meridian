import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BannerPreview from '@/components/ui/banner/preview';
import { Banner } from '@/components/ui/banner';

describe('the Banner preview', () => {
  it('offers no dismiss on the critical banner that needs action, as the README rules', () => {
    render(<BannerPreview />);
    expect(screen.getByRole('alert').querySelector('button[aria-label="Dismiss"]')).toBeNull();
  });

  it('dismisses for real where it offers it', () => {
    render(<BannerPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('All systems operational')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the banner again' }));
    expect(screen.getByText('All systems operational')).toBeTruthy();
  });
});

describe('a Banner with an action', () => {
  // jsdom applies no container query, so this holds the classes: the action's row is chosen by the banner's own width.
  it("puts its action beside the text by the banner's width, never the window's", () => {
    render(<Banner tone="critical" title="Not saved" action={<button type="button">Retry</button>} />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toMatch(/(^| )@container( |$)/);
    const row = screen.getByRole('button', { name: 'Retry' }).parentElement!.parentElement!;
    expect(row.className).toMatch(/@min-\[[\d.]+rem\]:flex-row/);
    expect(banner.innerHTML).not.toMatch(/\bsm:/);
  });
});

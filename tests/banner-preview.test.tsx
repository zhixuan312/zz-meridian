import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BannerPreview from '@/components/ui/banner/preview';

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

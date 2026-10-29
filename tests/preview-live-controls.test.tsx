import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DialogPreview from '@/components/ui/dialog/preview';
import PaginationPreview from '@/components/ui/pagination/preview';
import SearchInputPreview from '@/components/ui/search-input/preview';
import SegmentedPreview from '@/components/ui/segmented/preview';

// A preview's controls are pressed by whoever reads the Atlas: a press that changes nothing reads as a broken card.
describe('a preview control does what it says', () => {
  it('a Segmented size moves its choice', () => {
    render(<SegmentedPreview />);
    const small = screen.getByRole('radiogroup', { name: 'Small' });
    fireEvent.click(within(small).getByRole('radio', { name: 'Week' }));
    expect(within(small).getByRole('radio', { name: 'Week' }).getAttribute('aria-checked')).toBe('true');
  });

  it('a SearchInput size takes what is typed', () => {
    render(<SearchInputPreview />);
    const small = screen.getByRole('searchbox', { name: 'Small' }) as HTMLInputElement;
    fireEvent.change(small, { target: { value: 'eu-west' } });
    expect(small.value).toBe('eu-west');
  });

  it('a Pagination position moves on', () => {
    render(<PaginationPreview />);
    const first = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(first).getByRole('button', { name: /next/i }));
    expect(within(first).getByRole('button', { current: 'page' }).textContent).toBe('2');
  });

  it('the live dialog closes on Revoke key', () => {
    render(<DialogPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke key' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

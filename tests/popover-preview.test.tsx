import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PopoverPreview from '@/components/ui/popover/preview';

describe('the Popover preview, open', () => {
  it('draws no control that a keyboard reaches and an eye cannot see: its Apply closes it', () => {
    render(<PopoverPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    const open = screen.getByRole('dialog', { name: 'Status filter' });
    expect(open.querySelectorAll('.sr-only:is(button, a, input)')).toHaveLength(0);
    fireEvent.click(within(open).getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

describe('Popover', () => {
  it('is a dialog named by its caller: Radix names it by nothing', () => {
    render(<Popover open><PopoverTrigger>Status</PopoverTrigger><PopoverContent aria-label="Status filter">Options</PopoverContent></Popover>);
    expect(screen.getByRole('dialog', { name: 'Status filter' })).toBeTruthy();
  });

  it('cannot be written without a name', () => {
    // @ts-expect-error a popover is a dialog, and a dialog needs a name
    const unnamed = <PopoverContent>Options</PopoverContent>;
    expect(unnamed).toBeTruthy();
  });
});

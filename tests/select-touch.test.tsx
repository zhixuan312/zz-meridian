import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select } from '@/components/ui/select';

describe('a Select on a phone', () => {
  it('gives every option a 44px target under a coarse pointer, as a menu item has', async () => {
    render(<Select aria-label="Plan" defaultValue="scale" options={[{ value: 'starter', label: 'Starter' }, { value: 'scale', label: 'Scale' }]} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    for (const o of options) expect(o.className).toMatch(/(^|\s)pointer-coarse:min-h-11(\s|$)/);
  });
});

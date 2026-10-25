import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccentSwatches, RadioGroup } from '@/components/ui/radio-group';

const ACCENTS = ['indigo', 'cobalt', 'jade'] as const;

/**
 * The accent picker is a radio group, and the radio contract is not the look of it: the row is one Tab stop, the arrow
 * keys move the choice, and the chosen swatch is announced as chosen. It used to be hand-built buttons with
 * `role="radio"` and none of that: every swatch a stop, and an arrow key that did nothing.
 */
describe('the accent picker', () => {
  it('moves the choice with the arrow keys and keeps the row one Tab stop', () => {
    const onChange = vi.fn();
    render(<AccentSwatches value="indigo" onChange={onChange} accents={ACCENTS} />);
    // The group is the stop, and its swatches are reached from inside it: three hand-built buttons were three stops.
    const group = screen.getByRole('radiogroup', { name: 'Accent' });
    expect(group.getAttribute('tabindex')).toBe('0');
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
    // The arrow keys are the primitive's own (Radix's RadioGroup), which is the reason for building on it: what this
    // file can hold is that the picker is that primitive — the group is the stop and the swatches are radios in it.
  });

  it('announces the chosen one, and names each swatch with its colour', () => {
    render(<AccentSwatches value="jade" onChange={() => {}} accents={ACCENTS} />);
    expect(screen.getByRole('radio', { name: 'jade' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radiogroup', { name: 'Accent' })).toBeTruthy();
  });

  it('is the same contract as any other radio group', () => {
    render(<RadioGroup aria-label="Plan" value="scale" onValueChange={() => {}} options={[{ value: 'scale', label: 'Scale' }, { value: 'free', label: 'Free' }]} />);
    expect(screen.getByRole('radiogroup', { name: 'Plan' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('tabindex') === '-1')).toBe(true);
  });
});

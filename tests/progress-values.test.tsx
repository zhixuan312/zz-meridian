import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter, Progress } from '@/components/ui/progress';

const bar = () => screen.getByRole('progressbar');
const fill = () => bar().firstElementChild as HTMLElement;

describe('Progress reads what it was given, and nothing it was not', () => {
  it('a missing value reads as a dash, with no fill and no current value', () => {
    render(<Progress value={Number.NaN} label="Monthly quota" />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(fill().style.width).toBe('0%');
    expect(bar().getAttribute('aria-valuenow')).toBeNull();
  });
  it('a value past its whole is held to the whole on the bar and in its range, and its figure says the share it is', () => {
    render(<Progress value={23} max={20} label="Seats" />);
    expect(screen.getByText('115%')).toBeTruthy();
    expect(fill().style.width).toBe('100%');
    expect(bar().getAttribute('aria-valuenow')).toBe('20');
  });
  it('a bar with no label row, as in a table cell, is named by its aria-label', () => {
    render(<Progress value={42} size="sm" aria-label="Rollout to eu-west-1" />);
    expect(screen.getByRole('progressbar', { name: 'Rollout to eu-west-1' })).toBeTruthy();
  });
  it('a whole of zero is not a whole: a dash, not a share of one', () => {
    render(<Progress value={3} max={0} label="Seats" />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(bar().getAttribute('aria-valuenow')).toBeNull();
  });
  it('moves its width when the value changes, rather than snapping', () => {
    render(<Progress value={40} label="Monthly quota" />);
    expect(fill().className).toMatch(/transition-\[width\]/);
  });
  it('a meter holds its current value inside its range', () => {
    render(<Meter value={1.4} label="Plan used" />);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1');
  });
});

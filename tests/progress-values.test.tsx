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
  it('a value past its whole is held to the whole, on the bar and in its range', () => {
    render(<Progress value={140} max={100} label="Monthly quota" />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(bar().getAttribute('aria-valuenow')).toBe('100');
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

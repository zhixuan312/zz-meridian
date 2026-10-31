import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricTile } from '@/components/patterns/metric-tile';

const NOTE = '296 active · 14 trials · 10 past due';
const noteOf = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('span')].find((s) => s.textContent === NOTE)!;

describe("a tile's note", () => {
  it('keeps the whole note in its title', () => {
    const { container } = render(<MetricTile label="Customers" value={320} note={NOTE} />);
    const note = noteOf(container);
    expect(note).toHaveAttribute('title', NOTE);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A sparkline draws once it knows its width; the size hook is replaced with a stated one.
const size = vi.hoisted(() => ({ width: 120, height: 36 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  // The readout measures itself too, so it answers a width of its own rather than the line's.
  return { useSize: () => [useRef(null), size] as const };
});

import { Sparkline } from '@/components/charts/sparkline';

const values = [4, 8, 6, 10];
const fmt = (n: number) => `${n}K`;

/**
 * A sparkline is a shape with no cursor: right beside a Trend chart that reads point by point, a lone sparkline is the one
 * series a keyboard or screen-reader user cannot read at all. An optional readout fixes that without changing the
 * unlabelled sparkline a tile draws (#128).
 */
describe('a sparkline with a readout', () => {
  beforeEach(() => { size.width = 120; });

  it('is one Tab stop, named by what it shows and how to read it', () => {
    render(<Sparkline values={values} readout={{ label: 'Requests', format: fmt }} />);
    const line = screen.getByRole('img', { name: /^4K to 10K\. Use the arrow keys to read a point\.$/ });
    expect(line).toHaveAttribute('tabindex', '0');
  });

  it('reads the point under the pointer, value first', () => {
    const { container } = render(<Sparkline values={values} readout={{ label: 'Requests', format: fmt }} />);
    const line = screen.getByRole('img');
    fireEvent.pointerMove(line, { clientX: 0 });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('Requests');
    expect(container.querySelector('[data-readout]')?.textContent).toContain('4K');
  });

  it('steps with the arrow keys from the last point, and lets go on Escape', () => {
    const { container } = render(<Sparkline values={values} readout={{ label: 'Requests', format: fmt }} />);
    const line = screen.getByRole('img');
    line.focus();
    fireEvent.keyDown(line, { key: 'ArrowLeft' });
    // From the last point, one step back is the third of four values.
    expect(container.querySelector('[data-readout]')?.textContent).toContain('6K');
    fireEvent.keyDown(line, { key: 'Escape' });
    expect(container.querySelector('[data-readout]')).toBeNull();
  });

  it('says "No data" at a point with no value, never zero', () => {
    const { container } = render(<Sparkline values={[4, null, 6, 10]} readout={{ label: 'Requests', format: fmt }} />);
    const line = screen.getByRole('img');
    fireEvent.keyDown(line, { key: 'End' });
    fireEvent.keyDown(line, { key: 'ArrowLeft' });
    fireEvent.keyDown(line, { key: 'ArrowLeft' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('No data');
  });

  it('stays the unlabelled shape it was without the prop', () => {
    const { container } = render(<Sparkline values={values} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('tabindex');
    expect(container.querySelector('[data-readout]')).toBeNull();
  });
});

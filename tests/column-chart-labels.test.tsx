import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Which labels show is a rule about the chart's width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 220, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';

const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
const days = ['29 Sept', '30 Sept', '01 Oct', '02 Oct', '03 Oct'].map((label, i) => ({ key: dates[i], label, value: (i + 1) * 8 }));
/** The label under each column, or nothing where the column has none: the element that places it. */
const labels = (c: HTMLElement) => [...c.querySelectorAll(':scope figure > div[aria-hidden]:not([data-plot]) > span')].map((cell) => cell.firstElementChild as HTMLElement | null);
const plot = () => screen.getByRole('group', { name: /^Errors per day/ });

beforeEach(() => { size.width = 220; });

describe('a column chart: the labels under its first and last column', () => {
  it('start at the plot\'s leading edge and end at its trailing edge, so neither runs past the plot', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
    // Five dates at 220px: every second one is labelled, counted back from the last.
    expect(labels(container).map((l) => l?.textContent ?? null)).toEqual(['29 Sept', null, '01 Oct', null, '03 Oct']);
    const [first, , middle, , last] = labels(container);
    expect(first).toHaveClass('left-0');
    expect(first).not.toHaveClass('-translate-x-1/2');
    expect(last).toHaveClass('right-0');
    expect(last).not.toHaveClass('-translate-x-1/2');
    expect(middle).toHaveClass('left-1/2', '-translate-x-1/2');
  });

  it('keep their place when the column is the one pointed at', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(labels(container)[4]).toHaveTextContent('03 Oct');
    expect(labels(container)[4]).toHaveClass('right-0');
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(labels(container)[0]).toHaveClass('left-0');
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(labels(container)[1]).toHaveClass('left-1/2', '-translate-x-1/2');
  });

  it('place the pointed value of a plain chart the same way: it ends with the last column and starts with the first', () => {
    const { container } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} running />);
    const placed = (key: string) => container.querySelector(`[data-column="${key}"] [data-value]`)!.closest('.absolute') as HTMLElement;
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(placed(dates[4])).toHaveTextContent('40 · so far');
    expect(placed(dates[4])).toHaveClass('right-0');
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(placed(dates[0])).toHaveClass('left-0');
  });
});

describe('a column chart: what its focus ring encloses', () => {
  /** The scale: the box the ticks and the columns share, inside the plot. */
  const scale = (c: HTMLElement) => c.querySelector('[data-tick]')!.parentElement!.parentElement as HTMLElement;

  it('draws everything of the plot inside the plot\'s box, at any width: half a tick label\'s line under the zero tick, and a pointed value\'s height over the top one', () => {
    for (const width of [220, 720]) {
      size.width = width;
      const { container, unmount } = render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
      expect(scale(container).parentElement, String(width)).toBe(plot());
      // A tick's label is a 16px line centred on its gridline, so 8px hang under the zero tick; the tallest thing over a
      // column is its pointed value, 24px and 4px off the column.
      for (const tick of container.querySelectorAll('[data-tick]')) expect(tick, String(width)).toHaveClass('leading-4');
      expect(scale(container), String(width)).toHaveClass('bottom-2', 'top-7');
      unmount();
    }
  });

  it('keeps the ring on the plot itself, 4px off its box', () => {
    render(<ColumnChart label="Errors per day" columns={days} dates={dates} />);
    expect(plot()).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-offset-4', 'focus-visible:outline-accent');
  });
});

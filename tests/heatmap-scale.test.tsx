import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The hours group in threes under 560px; the size hook is replaced with a stated width.
const size = vi.hoisted(() => ({ width: 800, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { Heatmap } from '@/components/charts/heatmap';

/** A week of hours, empty but for Monday's first hours. */
const week = (monday: number[]) => Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d === 0 ? monday[h] ?? 0 : 0)));
const OUTLIER = [100, 200, 300, 400, 500, 600, 700, 800, 900, 100_000];
const steps = (c: HTMLElement, n: number) => Array.from({ length: n }, (_, h) => Number(c.querySelector(`[data-cell="0-${h}"]`)!.getAttribute('data-step')));
const legend = (c: HTMLElement) => c.querySelector('figcaption')!;

beforeEach(() => { size.width = 800; size.height = 0; });

describe('a heatmap on max, as it has always drawn', () => {
  it('gives a cell its share of the busiest cell, so one outlier flattens the rest', () => {
    const a = render(<Heatmap label="Requests by weekday and hour" values={week(OUTLIER)} />);
    expect(steps(a.container, 10)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 5]);
    expect(a.container.querySelector('[data-cell="3-12"]')).toHaveAttribute('data-step', '0');
    expect(legend(a.container)).toHaveTextContent('More');
    expect(legend(a.container)).not.toHaveTextContent(/or more/);
    a.unmount();
    const b = render(<Heatmap label="Requests by weekday and hour" values={week(OUTLIER)} scale="max" />);
    expect(steps(b.container, 10)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 5]);
    b.unmount();
    const c = render(<Heatmap label="Requests by weekday and hour" values={week([10, 30, 50, 70, 100])} />);
    expect(steps(c.container, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('a heatmap on quantile', () => {
  it('gives the outlier the top step and spreads the rest over five steps of equal count', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week(OUTLIER)} scale="quantile" />);
    expect(steps(container, 10)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(container.querySelector('[data-cell="3-12"]')).toHaveAttribute('data-step', '0');
  });

  it('reads the value the top step starts at in the legend, and the exact values in the table', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week(OUTLIER)} scale="quantile" />);
    expect(legend(container)).toHaveTextContent('900 or more');
    expect(legend(container)).toHaveTextContent('No requests');
    expect(screen.getByRole('table')).toHaveTextContent('100,000');
  });

  it('formats that value as the chart formats', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week(OUTLIER)} scale="quantile" format={(n) => `${n / 100}h`} unit="requests" />);
    expect(legend(container)).toHaveTextContent('9h or more');
  });

  it('gives equal values one step, the lowest their rank earns, and the largest value the top step', () => {
    const a = render(<Heatmap label="Requests by weekday and hour" values={week([3, 3, 3, 7, 7, 7])} scale="quantile" />);
    expect(steps(a.container, 6)).toEqual([1, 1, 1, 5, 5, 5]);
    expect(legend(a.container)).toHaveTextContent('7 or more');
    a.unmount();
    const b = render(<Heatmap label="Requests by weekday and hour" values={week([4, 4, 4])} scale="quantile" />);
    expect(steps(b.container, 3)).toEqual([5, 5, 5]);
    expect(legend(b.container)).toHaveTextContent('4 or more');
    b.unmount();
    const c = render(<Heatmap label="Requests by weekday and hour" values={week([1, 1, 1, 1, 1, 1, 1, 1, 5, 9])} scale="quantile" />);
    expect(steps(c.container, 10)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 5, 5]);
    expect(legend(c.container)).toHaveTextContent('5 or more');
  });

  it('has nothing to rank when every cell is zero', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week([])} scale="quantile" />);
    expect(steps(container, 3)).toEqual([0, 0, 0]);
    expect(legend(container)).toHaveTextContent('More');
    expect(legend(container)).not.toHaveTextContent(/or more/);
  });

  it('ranks the cells it draws: grouped in threes on a narrow container', () => {
    size.width = 400;
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week([1, 2, 3, 4, 5, 6, 7, 8, 9, 1000])} scale="quantile" />);
    // 6, 15, 24 and 1,000: four cells, so the steps are 2, 3, 4 and 5.
    expect(steps(container, 4)).toEqual([2, 3, 4, 5]);
    expect(legend(container)).toHaveTextContent('1,000 or more');
  });

  it('ranks days as it ranks hours', () => {
    const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000].map((value, i) => ({ date: `2026-09-${String(21 + i).padStart(2, '0')}`, value }));
    const { container } = render(<Heatmap label="Requests a day" days={days} scale="quantile" />);
    expect(days.map((d) => Number(container.querySelector(`[data-cell="${d.date}"]`)!.getAttribute('data-step')))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(legend(container)).toHaveTextContent('9 or more');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';

const minutes = Array.from({ length: 61 }, (_, i) => `2026-10-01T09:${String(i).padStart(2, '0')}`);
const at = (mm: number) => minutes[mm];
const series = [{ key: 'p95', label: 'p95', values: minutes.map((_, i) => 200 + (i > 25 && i < 32 ? 120 : 0)) }];
const span = { from: at(25), to: at(31), label: 'Above the ceiling' };

/**
 * A monitoring chart often has to show when a condition held, not only where the line was. The three marks TrendChart
 * had were a y-region, a level line and a dot per named date; a period was none of them (#124).
 */
describe('TrendChart spans', () => {
  beforeEach(() => { size.width = 640; });

  it('draws a full-height wash across the period, from its first date to its last', () => {
    const { container } = render(<TrendChart label="p95" dates={minutes} series={series} spans={[span]} />);
    const wash = container.querySelector('[data-span="Above the ceiling"]')!;
    expect(wash).not.toBeNull();
    expect(wash.getAttribute('height')).toBe(String(Number(wash.getAttribute('height'))));
    // The wash is as wide as the dates between its ends, and narrower than the plot.
    expect(Number(wash.getAttribute('width'))).toBeGreaterThan(0);
  });

  it('names the span in the caption and in a visible key, not only in the drawing', () => {
    const { container } = render(<TrendChart label="p95" dates={minutes} series={series} spans={[span]} />);
    expect(container.querySelector('table caption')?.textContent).toContain('Above the ceiling (2026-10-01T09:25–2026-10-01T09:31)');
    expect(container.querySelector('[data-key-span]')?.textContent).toBe('Above the ceiling');
  });

  it('says which span a pointed point stands in, in the readout and to a screen reader', () => {
    const { container } = render(<TrendChart label="p95" dates={minutes} series={series} spans={[span]} />);
    const plot = screen.getByRole('img', { name: /Use the arrow keys/ });
    // From the last point, four steps back lands at 09:57, outside the span; End then Home would be far. Step to 09:28.
    for (let i = 0; i < 33; i++) fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('Above the ceiling');
  });

  it('draws no wash and no key for a span whose dates the plot does not hold', () => {
    const { container } = render(<TrendChart label="p95" dates={minutes} series={series} spans={[{ from: '2026-09-01T00:00', to: '2026-09-01T01:00', label: 'Elsewhere' }]} />);
    expect(container.querySelector('[data-span]')).toBeNull();
    expect(container.querySelector('[data-key-span]')).toBeNull();
  });

  it('reaches the edge of the plot for a period still open there', () => {
    const { container } = render(<TrendChart label="p95" dates={minutes} series={series} spans={[{ from: at(50), to: '2026-10-01T23:59', label: 'Still under way' }]} />);
    // Its `to` is not a date of the plot, so the wash runs to the last point, and its start is still its own date.
    expect(container.querySelector('[data-span="Still under way"]')).not.toBeNull();
  });
});

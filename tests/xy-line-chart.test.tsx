import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 720, height: 240 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { XYLineChart, type XYSeries } from '@/components/charts/xy-line-chart';
import { formatPercent } from '@/lib/format';

const ms = (n: number) => `${n} ms`;
const series: XYSeries[] = [
  { key: 'a', label: 'Answered within', points: [{ x: 100, y: 0.5 }, { x: 200, y: 0.8 }, { x: 300, y: 0.95 }] },
  { key: 'b', label: 'Cached', points: [{ x: 100, y: 0.2 }, { x: 200, y: 0.4 }, { x: 300, y: null }] },
];
const draw = (props: Partial<Parameters<typeof XYLineChart>[0]> = {}) =>
  render(<XYLineChart label="Share answered within each latency" series={series} xLabel="Latency, ms" yLabel="Share" xFormat={ms} {...props} />);

/**
 * A measure read against a number, not against time: the x positions are the values themselves. TrendChart places points
 * by index, and no 0.37.1 chart takes `{ x, y }` on a scaled x-axis (#125).
 */
describe('XYLineChart', () => {
  beforeEach(() => { size.width = 720; });

  it('places every point at its own x, and labels both axes in their units', () => {
    const { container } = draw();
    expect(container.querySelectorAll('[data-series]')).toHaveLength(2);
    const ticks = [...container.querySelectorAll('[data-x-tick]')].map((t) => t.textContent);
    expect(ticks).toEqual(['100 ms', '200 ms', '300 ms']);
    expect(container.textContent).toContain('Latency, ms');
    expect(container.textContent).toContain('Share');
  });

  it('breaks a line at a point with no value rather than drawing through it', () => {
    const { container } = draw({ series: [{ key: 'b', label: 'Cached', points: [{ x: 100, y: 0.2 }, { x: 200, y: null }, { x: 300, y: 0.7 }] }] });
    const d = container.querySelector('[data-series="b"]')?.getAttribute('d') ?? '';
    // Two stretches, each its own path command, not one line bridged across the gap.
    expect(d.match(/M/g)?.length).toBe(2);
  });

  it('names every x and every series’ value there in a table, with a gap said in words', () => {
    const { container } = draw({ format: (n) => formatPercent(n, 1) });
    const rows = [...container.querySelectorAll('table tbody tr')];
    expect(rows.map((r) => [...r.querySelectorAll('th,td')].map((c) => c.textContent))).toEqual([
      ['100 ms', '50.0%', '20.0%'],
      ['200 ms', '80.0%', '40.0%'],
      ['300 ms', '95.0%', 'No value'],
    ]);
  });

  it('steps the cursor along the measured x values with the arrow keys and reads them', () => {
    const { container } = draw();
    const plot = screen.getByRole('group', { name: /Use the arrow keys/ });
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('Latency, ms 100 ms');
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(container.querySelector('[data-readout]')?.textContent).toContain('200 ms');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(container.querySelector('[data-readout]')).toBeNull();
  });

  it('holds the y scale to a stated range and says the range it drew when a value is outside it', () => {
    const held = draw({ domain: [0, 1] });
    expect(held.container.querySelector('[data-widened]')).toBeNull();
    held.unmount();
    const widened = draw({ domain: [0, 0.5], format: (n) => formatPercent(n, 0) });
    expect(widened.container.querySelector('[data-widened]')?.textContent).toMatch(/^Scale widened from 0%–50% to /);
  });

  it('joins readings straight or holds each level, as the curve says', () => {
    const { container: linear } = draw({ curve: 'linear' });
    expect(linear.querySelector('[data-series="a"]')?.getAttribute('d')).not.toContain('H');
    const { container: step } = draw({ curve: 'step' });
    expect(step.querySelector('[data-series="a"]')?.getAttribute('d')).toContain('H');
  });
});

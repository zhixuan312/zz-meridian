import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The plot is drawn at a stated width: the size hook is replaced, as the Column chart's tests do.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 600, height: 0 }] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';

const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
const ticks = (c: HTMLElement) => [...c.querySelectorAll('svg text')].map((t) => t.textContent ?? '').filter((t) => /\d/.test(t) && !/Oct|Sep/.test(t));
/** Every y a path passes through. */
const ys = (c: HTMLElement) => [...c.querySelectorAll('svg path')].flatMap((p) => [...(p.getAttribute('d') ?? '').matchAll(/-?\d+(?:\.\d+)?,(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])));
const cells = (c: HTMLElement) => [...c.querySelectorAll('table tbody td:not(:first-child)')].map((t) => t.textContent);

describe('a trend chart of a signed series (#80)', () => {
  it('takes its axis under zero, with zero a level, and draws every value inside the plot', () => {
    const { container } = render(<TrendChart label="Net change a day" height={248} dates={dates} series={[{ key: 'n', label: 'Net change', values: [3, -2, 4, -3], kind: 'line' }]} />);
    expect(ticks(container)).toContain('0');
    expect(ticks(container).some((t) => t.startsWith('-') || t.startsWith('−'))).toBe(true);
    for (const y of ys(container)) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(248); }
  });

  it('holds a series below zero on every day', () => {
    const { container } = render(<TrendChart label="Net flow a day" height={248} dates={dates} series={[{ key: 'n', label: 'Net flow', values: [-3, -8, -5, -12], kind: 'area' }]} />);
    expect(ticks(container)).toContain('0');
    for (const y of ys(container)) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(248); }
  });
});

describe('a trend chart given a format of its own (#78)', () => {
  it('reads each value with it, and the axis with axisFormat', () => {
    const price = (n: number) => n.toFixed(4);
    const { container } = render(<TrendChart label="Price a day" height={248} floor={0.999} format={price} axisFormat={(n) => n.toFixed(4)} dates={dates.slice(0, 3)} series={[{ key: 'p', label: 'Price', values: [0.99986, 0.9997, 1.0001], kind: 'line' }]} />);
    expect(cells(container)).toEqual(['0.9999', '0.9997', '1.0001']);
    // Every level is its own figure: no two ticks read alike.
    expect(new Set(ticks(container)).size).toBe(ticks(container).length);
    expect(ticks(container).length).toBeGreaterThanOrEqual(3);
  });

  it('reads the axis as the format does when no axisFormat is given, and a missing value as a dash', () => {
    const ratio = (n: number) => n.toFixed(6);
    const { container } = render(<TrendChart label="Ratio a day" height={248} floor={1.001} format={ratio} dates={dates.slice(0, 3)} series={[{ key: 'r', label: 'Ratio', values: [1.001061, null, 1.001064], kind: 'line' }]} />);
    expect(cells(container)).toEqual(['1.001061', '—', '1.001064']);
    expect(ticks(container).every((t) => /^\d\.\d{6}$/.test(t))).toBe(true);
  });

  it('draws a ratio that peaks under 1 to its own top, not along the floor of a scale to 1', () => {
    const { container } = render(<TrendChart label="Error rate a day" height={248} format="percent" dates={dates.slice(0, 3)} series={[{ key: 'e', label: 'Errors', values: [0.002, 0.004, 0.003], kind: 'line' }]} />);
    expect(ticks(container)).not.toContain('100%');
  });
});

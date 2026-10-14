import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A chart draws once it knows its width, and where a label stands is a rule about that width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { TrendChart, type TrendSeries } from '@/components/charts/trend-chart';

const dates = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
const usual = { value: 296, label: 'Median 296ms' };
const line = (key: string, values: number[]): TrendSeries => ({ key, label: key, values, kind: 'line' });
/** Thirty days that stay within 30 ms of their median, as the sample's p95 does. */
const hugging = dates.map((_, i) => 296 + Math.round(28 * Math.sin(i * 2.1)));
/** Far under the median until the last ten days, which run along it. */
const huggingAtTheEnd = dates.map((_, i) => (i < 20 ? 120 : hugging[i]));
const huggingAtTheStart = [...huggingAtTheEnd].reverse();
/** Well over the median, or well under it, all month. */
const high = dates.map((_, i) => 480 + (i % 5) * 6);
const low = dates.map((_, i) => 110 + (i % 5) * 6);

const num = (el: Element, name: string) => Number(el.getAttribute(name));
/** The baseline: the one dashed level line of the plot. */
const dash = (c: HTMLElement) => c.querySelector('svg line[stroke-dasharray]')!;
const label = (c: HTMLElement) => [...c.querySelectorAll('svg text')].find((t) => t.textContent === usual.label) ?? null;
/** The plot: from the top gridline to the axis, as wide as the baseline. */
function plot(c: HTMLElement) {
  const levels = [...c.querySelectorAll('svg line[shape-rendering]')].map((l) => num(l, 'y1'));
  return { left: num(dash(c), 'x1'), right: num(dash(c), 'x2'), top: Math.min(...levels), bottom: Math.max(...levels) };
}
/** The label's box: a line of `text-2xs`, 7px a character at its widest, its ink from 9px over its baseline to 3px under it. */
function box(c: HTMLElement) {
  const text = label(c)!, x = num(text, 'x'), y = num(text, 'y'), wide = text.textContent!.length * 7;
  const left = text.getAttribute('text-anchor') === 'end' ? x - wide : x;
  return { left, right: left + wide, top: y - 9, bottom: y + 3 };
}
/** The points a path is drawn through: where it starts, and where each stretch of it ends. */
const points = (path: Element) => [...path.getAttribute('d')!.matchAll(/[MLC]([^MLCZ]*)/g)].map((m) => m[1].trim().split(/[ ,]+/).map(Number).slice(-2) as [number, number]);
/**
 * What is drawn through the label: every path of the plot (a line, its glow, an area, a band, a hairline) whose points
 * under the label's span are neither all over its box nor all under it.
 */
function through(c: HTMLElement) {
  const b = box(c);
  return [...c.querySelectorAll('svg path')].filter((path) => {
    const ys = points(path).filter(([x]) => x >= b.left && x <= b.right).map(([, y]) => y);
    return !(ys.every((y) => y < b.top) || ys.every((y) => y > b.bottom));
  }).map((path) => path.getAttribute('d')!.slice(0, 40));
}
/** The label stands at an end of the dashed line, inside the plot or the 14px the chart keeps over its top gridline, with nothing drawn through it. */
function stands(c: HTMLElement, at: string) {
  const b = box(c), p = plot(c), text = label(c)!;
  expect(through(c), at).toEqual([]);
  expect([`end ${p.right}`, `start ${p.left}`], at).toContain(`${text.getAttribute('text-anchor')} ${num(text, 'x')}`);
  expect(b.left, at).toBeGreaterThanOrEqual(p.left);
  expect(b.right, at).toBeLessThanOrEqual(p.right);
  expect(b.top, at).toBeGreaterThanOrEqual(p.top - 14);
  expect(b.bottom, at).toBeLessThanOrEqual(p.bottom);
  // Beside the dashed line, never on it: its text 6px over the line at the nearest, or its ink 5px under.
  expect(num(text, 'y') <= num(dash(c), 'y1') - 6 || num(text, 'y') >= num(dash(c), 'y1') + 14, at).toBe(true);
}
const chart = (series: TrendSeries[], more: { stacked?: boolean } = {}) => render(<TrendChart label="Latency p95 per day" height={168} format="duration" dates={dates} series={series} baseline={usual} {...more} />);

beforeEach(() => { size.width = 640; });

describe('a trend chart\'s baseline: where its label stands', () => {
  it('is the right end, 6px over the dashed line, while nothing is drawn there', () => {
    for (const values of [high, huggingAtTheStart]) {
      const { container, unmount } = chart([line('p95', values)]);
      const text = label(container)!;
      expect(text.getAttribute('text-anchor')).toBe('end');
      expect(num(text, 'x')).toBe(plot(container).right);
      expect(num(text, 'y')).toBe(num(dash(container), 'y1') - 6);
      stands(container, 'as it was');
      unmount();
    }
  });

  it('is under the dashed line when the baseline is the top of the scale: the label keeps to the chart\'s box', () => {
    const { container } = render(<TrendChart label="Latency p95 per day" height={168} format="duration" dates={dates} series={[line('p95', low)]} baseline={{ value: 300, label: usual.label }} />);
    const text = label(container)!;
    expect(num(dash(container), 'y1')).toBe(plot(container).top);
    expect(text.getAttribute('text-anchor')).toBe('end');
    expect(num(text, 'y')).toBe(num(dash(container), 'y1') + 14);
    stands(container, 'top of the scale');
  });

  it('is clear of a line that runs along the baseline, on a desk and on a phone, where the label spans many points', () => {
    for (const width of [960, 640, 320]) {
      size.width = width;
      const { container, unmount } = chart([line('p95', hugging)]);
      stands(container, `${width}px`);
      unmount();
    }
  });

  it('is the left end, 6px over the dashed line, when the line runs along the baseline at the right end only: the nearest clear place', () => {
    for (const width of [640, 320]) {
      size.width = width;
      const { container, unmount } = chart([line('p95', huggingAtTheEnd)]);
      const text = label(container)!;
      expect(text.getAttribute('text-anchor'), String(width)).toBe('start');
      expect(num(text, 'x'), String(width)).toBe(plot(container).left);
      expect(num(text, 'y'), String(width)).toBe(num(dash(container), 'y1') - 6);
      stands(container, `${width}px`);
      unmount();
    }
  });

  it('is clear of every line of several', () => {
    for (const width of [640, 320]) {
      size.width = width;
      const { container, unmount } = chart([line('p95', huggingAtTheEnd), line('p90', huggingAtTheStart), line('p50', low)]);
      stands(container, `${width}px`);
      unmount();
    }
  });

  it('stands over an area and never in it: an area owns everything under its line', () => {
    for (const width of [640, 320]) {
      size.width = width;
      const { container, unmount } = chart([{ key: 'p95', label: 'p95', values: hugging.map((v) => v + 40), kind: 'area' }]);
      stands(container, `${width}px`);
      const b = box(container);
      const under = points(container.querySelector('svg path[stroke-width="2"]')!).filter(([x]) => x >= b.left && x <= b.right);
      expect(under.length, String(width)).toBeGreaterThan(0);
      for (const [, y] of under) expect(y, String(width)).toBeGreaterThan(b.bottom);
      unmount();
    }
  });

  it('stands over the total of a stack', () => {
    const { container } = chart([line('us', hugging.map((v) => v - 100)), line('eu', dates.map(() => 60)), line('ap', dates.map(() => 40))], { stacked: true });
    stands(container, 'stacked');
  });

  it('is not drawn when no place beside the dashed line is clear, and the table\'s caption still names the baseline', () => {
    // Thirteen level lines, 50 ms apart, leave no room for a line of text anywhere in the plot.
    const { container } = chart(Array.from({ length: 13 }, (_, k) => line(`l${k}`, dates.map(() => k * 50))));
    expect(dash(container)).not.toBeNull();
    expect(label(container)).toBeNull();
    expect(screen.getByRole('table')).toHaveAccessibleName('Latency p95 per day. Median 296ms');
  });
});

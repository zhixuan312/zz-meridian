import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A chart draws once it knows its width, and the band's label stands where a rule about that width says: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { TrendChart, type TrendSeries } from '@/components/charts/trend-chart';

const dates = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
const band = { value: 350, label: 'Band: p95 under 350 ms' };
/** Mostly flat near 200 ms, with two days over the ceiling — and one that left the band on its error rate, whose p95 is low. */
const outside = new Set([4, 17, 22]);
const p95 = dates.map((_, i) => (outside.has(i) ? (i === 17 ? 168 : 470 + i) : 190 + (i % 4) * 8));
const line: TrendSeries = { key: 'p95', label: 'p95', values: p95, kind: 'line' };

const num = (el: Element, name: string) => Number(el.getAttribute(name));
const drawn = (c: HTMLElement) => c.querySelector('svg rect[data-band]')!;
const marks = (c: HTMLElement) => [...c.querySelectorAll('svg g[data-mark]')];
const dot = (m: Element) => m.querySelector('circle')!;
const stem = (m: Element) => m.querySelector('line')!;
/** The level lines of the plot: the gridlines, the axis, and a band's top edge. */
const levels = (c: HTMLElement) => [...c.querySelectorAll('svg line[shape-rendering]')].map((l) => num(l, 'y1'));
/** The ceiling's own level line: the horizontal one drawn at the band's height. */
const edge = (c: HTMLElement, y: number) => [...c.querySelectorAll('svg line[shape-rendering]')].find((l) => num(l, 'y1') === y && num(l, 'y2') === y);

const chart = (more: Partial<Parameters<typeof TrendChart>[0]> = {}) =>
  render(<TrendChart label="Latency p95 per day" height={168} format="duration" dates={dates} series={[line]} band={band} {...more} />);

beforeEach(() => { size.width = 640; });

describe('a trend chart\'s band: the region the page is judged against', () => {
  it('is the plot\'s whole width, from the ceiling down to the axis floor, in the track\'s own wash', () => {
    const { container } = chart();
    const rect = drawn(container);
    // The plot's floor and its left edge are the axis line's: the band stands on the axis, not beside it.
    const axis = Math.max(...levels(container));
    const [, left] = [...container.querySelectorAll('svg line[shape-rendering]')].map((l) => [num(l, 'y1'), num(l, 'x1')]).find(([y]) => y === axis)!;
    const right = Math.max(...[...container.querySelectorAll('svg line[shape-rendering]')].map((l) => num(l, 'x2')));
    expect(num(rect, 'y')).toBeLessThan(axis);
    expect(num(rect, 'y') + num(rect, 'height')).toBe(axis);
    expect(num(rect, 'x')).toBe(left);
    expect(num(rect, 'width')).toBe(right - left);
    expect(rect.getAttribute('fill')).toBe('var(--fill-track)');
  });

  it('raises the scale to hold its ceiling, so the whole band is on the chart whatever the data does', () => {
    for (const values of [p95.map(() => 60), p95.map(() => 900)]) {
      const { container, unmount } = chart({ series: [{ ...line, values }] });
      const rect = drawn(container);
      expect(num(rect, 'height'), 'height').toBeGreaterThan(0);
      expect(num(rect, 'y'), 'inside the plot').toBeGreaterThanOrEqual(Math.min(...levels(container)));
      // Its top edge is drawn as the axis is drawn, so the ceiling is a line and not only the wash's edge.
      expect(edge(container, num(rect, 'y')), 'edge').toBeTruthy();
      unmount();
    }
  });

  it('names the ceiling beside it, clear of the data, and the table\'s caption names it too', () => {
    const { container } = chart();
    const text = [...container.querySelectorAll('svg text')].find((t) => t.textContent === band.label)!;
    expect(text).toBeTruthy();
    expect(num(text, 'y')).toBeLessThan(num(drawn(container), 'y') + 20);
    expect(container.querySelector('table caption')!.textContent).toContain(band.label);
  });

  it('is drawn beside what is usual when a chart is given both: a level and a region are not one mark', () => {
    const { container } = chart({ baseline: { value: 296, label: 'Median 296ms' } });
    expect(drawn(container)).toBeTruthy();
    expect(container.querySelector('svg line[stroke-dasharray]'), 'the median stays a dashed line').toBeTruthy();
    expect(container.querySelector('table caption')!.textContent).toBe('Latency p95 per day. Band: p95 under 350 ms. Median 296ms');
  });

  it('draws no region and no ceiling when it is given no band', () => {
    const { container } = chart({ band: undefined });
    expect(container.querySelector('svg rect[data-band]')).toBeNull();
    expect(container.querySelector('svg line[stroke-dasharray]')).toBeNull();
  });
});

describe('a trend chart\'s marks: the days a fact names', () => {
  const named = ['2026-09-05', '2026-09-18', '2026-09-23'];

  it('is a dot on that day\'s own point of the first series and a stem from it to the axis, so a point inside the region is found too', () => {
    const { container } = chart({ marks: { dates: named, tone: 'warning', label: '3 days outside the band' } });
    const found = marks(container);
    expect(found).toHaveLength(3);
    const floor = Math.max(...levels(container));
    const ceiling = num(drawn(container), 'y');
    for (const m of found) {
      expect(dot(m).getAttribute('fill')).toBe('var(--warning)');
      expect(num(dot(m), 'cx')).toBe(num(stem(m), 'x1'));
      expect(num(dot(m), 'cy')).toBe(num(stem(m), 'y1'));
      expect(num(stem(m), 'y2')).toBe(floor);
    }
    // The first named day's point is over the ceiling; the flat days' are under it, and their stems reach the axis anyway.
    expect(num(dot(found[0]), 'cy')).toBeLessThan(ceiling);
    expect(found.some((m) => num(dot(m), 'cy') > ceiling), 'a mark under the ceiling, where the line is dense').toBe(true);
    expect(container.querySelector('table caption')!.textContent).toContain('Marked: 3 days outside the band');
  });

  it('skips a day the chart does not draw, and a day with no value, rather than marking the wrong point', () => {
    const { container } = chart({
      series: [{ ...line, values: p95.map((v, i) => (i === 17 ? null : v)) }],
      marks: { dates: [...named, '2026-10-01'], tone: 'warning', label: '2 days outside the band' },
    });
    expect(marks(container)).toHaveLength(2);
  });

  it('draws none where the page names no day', () => {
    const { container } = chart({ marks: { dates: [], tone: 'warning', label: 'no day outside the band' } });
    expect(marks(container)).toHaveLength(0);
  });
});

import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A server knows no width, and a rule about a chart's width is tested at a stated one: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 0, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart, type ColumnPart, type StackedColumn } from '@/components/charts/column-chart';

/** A year of days, as the sample's longest period is: 360 columns. */
const dates = Array.from({ length: 360 }, (_, i) => new Date(Date.UTC(2025, 9, 8 + i)).toISOString().slice(0, 10));
const year = dates.map((date, i) => ({ key: date, label: date.slice(5), value: 200 + ((i * 37) % 900) }));
const week = year.slice(-7);
const parts: ColumnPart[] = [{ key: 'us', label: 'US' }, { key: 'eu', label: 'EU' }];
const stacked: StackedColumn[] = year.map((c) => ({ key: c.key, label: c.label, values: [c.value, 100] }));

/** The chart as a server writes it: no script has run and no width is known. */
function served(chart: ReactElement) {
  const el = document.createElement('div');
  el.innerHTML = renderToString(chart);
  return el;
}
/** The two rows that share the plot's width: the columns, and the labels under them. */
const rows = (c: HTMLElement) => [c.querySelector('[data-column]')!.parentElement!, c.querySelector('figure > div[aria-hidden]:not([data-plot])')!] as HTMLElement[];
/** The space a row keeps between its columns, as its markup says it. */
const gap = (row: HTMLElement) => /(?:^|;)\s*column-gap:([^;]+)/.exec(row.getAttribute('style') ?? '')?.[1].trim() ?? '';
/** What a gap written as an expression of its row's width comes to, in pixels, in a row that many pixels wide. */
function px(expression: string, row: number) {
  const js = expression.replace(/100%/g, String(row)).replace(/px/g, '').replace(/calc\(/g, '(');
  return new Function('clamp', `return ${js}`)((least: number, value: number, most: number) => Math.min(Math.max(value, least), most)) as number;
}

beforeEach(() => { size.width = 0; });

describe('a column chart with more columns than room, as a server writes it', () => {
  it('fixes no gap in either row: the gap is an expression of the row\'s own width, the same under the columns as between them', () => {
    const c = served(<ColumnChart label="Errors per day" dates={dates} columns={year} />);
    expect(c.querySelectorAll('[data-column]')).toHaveLength(360);
    for (const row of rows(c)) {
      expect(row.className.split(' ').filter((name) => name.startsWith('gap-'))).toEqual([]);
      expect(gap(row)).toContain('100%');
    }
    expect(gap(rows(c)[1])).toBe(gap(rows(c)[0]));
  });

  it('closes the gap a whole pixel at a time, so 360 columns never ask a row for more than its width', () => {
    const [row] = rows(served(<ColumnChart label="Errors per day" dates={dates} columns={year} />));
    for (const wide of [0, 120, 258, 500, 718, 719, 720, 1078, 1079, 1500, 2300]) {
      const g = px(gap(row), wide);
      expect([0, 1, 2], `${wide}px`).toContain(g);
      expect(359 * g, `${wide}px`).toBeLessThanOrEqual(wide);
      // Whatever the gap takes, every column keeps a pixel of its own.
      if (g > 0) expect((wide - 359 * g) / 360, `${wide}px`).toBeGreaterThanOrEqual(1);
    }
    expect(px(gap(row), 258)).toBe(0);
    expect(px(gap(row), 900)).toBe(1);
    expect(px(gap(row), 2300)).toBe(2);
  });

  it('keeps the 2px of a chart with room, in any row a card gives it', () => {
    const [row] = rows(served(<ColumnChart label="Errors per day" columns={week} />));
    for (const wide of [40, 150, 258, 700, 1400]) expect(px(gap(row), wide), `${wide}px`).toBe(2);
    const [month] = rows(served(<ColumnChart label="Errors per day" dates={dates.slice(-30)} columns={year.slice(-30)} />));
    for (const wide of [150, 258, 700, 1400]) expect(px(gap(month), wide), `${wide}px`).toBe(2);
  });

  it('has no gap to keep with one column', () => {
    const [row] = rows(served(<ColumnChart label="Errors per day" columns={week.slice(-1)} />));
    for (const wide of [0, 258, 700]) expect(px(gap(row), wide), `${wide}px`).toBe(0);
  });
});

describe('a column chart with more columns than room, once it knows its width', () => {
  it('reads a column where the column stands: with the gap closed, the first column ends one column into the plot', () => {
    size.width = 720;
    const { container } = render(<ColumnChart label="Requests per day" parts={parts} columns={stacked} dates={dates} data-preview-index={0} />);
    const gutter = parseFloat((container.querySelector('[data-tick]') as HTMLElement).style.getPropertyValue('--w'));
    const cursor = parseFloat((container.querySelector('[data-readout]') as HTMLElement).style.getPropertyValue('--readout-cursor'));
    expect(cursor).toBeCloseTo(gutter + (720 - gutter) / 360, 3);
  });

  it('keeps the outline of a running column inside the plot: narrower than the 4px the outline needs, it ends with its column', () => {
    const { container } = render(<ColumnChart label="Errors per day" dates={dates} columns={year} running />);
    const outline = container.querySelector('[data-running] .border-dashed')!;
    expect(outline).toHaveClass('ml-[min(0px,calc(100%-4px))]');
    expect(container.querySelectorAll('[class*="ml-["]')).toHaveLength(1);
  });
});

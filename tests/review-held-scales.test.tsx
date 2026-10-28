import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// A rule about a chart's width is tested at a stated width: the size hook is replaced.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 480, height: 200 }] as const };
});

import { BarList } from '@/components/charts/bar-list';
import { GroupedColumns } from '@/components/charts/column-chart/grouped';
import { DivergingBars } from '@/components/charts/diverging-bars';
import { TrendChart } from '@/components/charts/trend-chart';

// Defects the review of issue #99's forms found on edge paths: a held scale under one, a seventh grouped part, a dot on a
// running point, a node label on a diverging row, the widening words of an area held above zero, an estimate with no
// figure, and the forced-colours fill of an estimate whose colour is an inline style.

const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];

describe('the forms of issue #99 on their edge paths', () => {
  it('a Bar list holds a max under one: every bar against it, no extra level, no widening', () => {
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    const { container } = render(<BarList label="Rates" max={0.5} axis format={pct} items={[{ key: 'a', label: 'A', value: 0.4 }, { key: 'b', label: 'B', value: 0.2 }]} />);
    expect([...container.querySelectorAll('[data-bar]')].map((b) => (b as HTMLElement).style.width)).toEqual(['80%', '40%']);
    expect([...container.querySelectorAll('[data-level]')].at(-1)?.textContent).toBe('50%');
    expect(container.querySelector('[data-widened]')).toBeNull();
  });

  it("a Bar list's words and bars are positioned, so its axis's gridlines, positioned before them, paint under them", () => {
    const { container } = render(<BarList label="Regions" axis items={[{ key: 'a', label: 'A long region label', value: 40 }, { key: 'b', label: 'B', value: 10 }]} />);
    expect(container.querySelector('[data-gridline]')).not.toBeNull();
    for (const row of container.querySelectorAll('li[data-row]')) {
      expect(row.firstElementChild?.classList.contains('relative')).toBe(true);
      expect(row.querySelector('[data-bar]')?.classList.contains('relative')).toBe(true);
    }
  });

  it('a Bar list row below zero draws an empty bar and outline, never a width a browser drops for the whole track', () => {
    const below: string[] = [];
    const styles = Object.getPrototypeOf(document.createElement('div').style);
    const d = Object.getOwnPropertyDescriptor(styles, 'width')!;
    Object.defineProperty(styles, 'width', { ...d, set(v: unknown) { below.push(String(v)); d.set!.call(this, v); } });
    try {
      const { container } = render(<BarList label="Change" pair={{ label: 'Now', compareLabel: 'Before' }} items={[{ key: 'a', label: 'A', value: 4, compare: -2 }, { key: 'b', label: 'B', value: -3, compare: 1 }]} />);
      expect(below.filter((w) => w.startsWith('-'))).toEqual([]);
      expect((container.querySelector('li[data-row="b"] [data-bar]') as HTMLElement).style.width).toBe('0%');
      expect(container.querySelector('li[data-row="b"] [data-figure]')?.textContent).toMatch(/^-3/);
    } finally {
      Object.defineProperty(styles, 'width', d);
    }
  });

  it('a Bar list held at a max not above zero draws against one', () => {
    const { container } = render(<BarList label="Rates" max={0} items={[{ key: 'a', label: 'A', value: 0.25 }]} />);
    expect((container.querySelector('[data-bar]') as HTMLElement).style.width).toBe('25%');
    expect(container.querySelector('[data-widened]')).toBeNull();
  });

  it('a grouped Column chart draws a part past the sixth slot in the neutral, never in a slot no theme defines', () => {
    const parts = Array.from({ length: 7 }, (_, k) => ({ key: `p${k}`, label: `P${k}` }));
    const { container } = render(<GroupedColumns grouped label="G" parts={parts} columns={[{ key: 'c', label: 'C', values: [1, 2, 3, 4, 5, 6, 7] }]} />);
    const fills = [...container.querySelectorAll('[data-part]')].map((p) => (p as HTMLElement).style.backgroundColor);
    expect(fills.at(-1)).toBe('var(--chart-neutral-strong)');
    expect(fills.some((f) => /series-(?:[7-9]|\d\d)/.test(f))).toBe(false);
  });

  it('a running grouped part with no data reads "So far" at rest rather than its words cut short', () => {
    const parts = [{ key: 'in', label: 'In' }, { key: 'out', label: 'Out' }];
    const columns = [{ key: 'd1', label: 'Mon', values: [120, 80] }, { key: 'd2', label: 'Tue', values: [100, 90] }, { key: 'd3', label: 'Wed', values: [60, null] }];
    const { container } = render(<GroupedColumns grouped running label="G" parts={parts} columns={columns} />);
    const d3 = container.querySelector('[data-column="d3"]')!;
    expect([...d3.querySelectorAll('[data-value]')].map((v) => v.textContent)).toEqual(['60', 'So far']);
  });

  it('a grouped group with no data whose words are cut at rest keeps them whole in its title, as a plain column does', () => {
    const parts = [{ key: 'in', label: 'In' }, { key: 'out', label: 'Out' }];
    const columns = Array.from({ length: 11 }, (_, i) => ({ key: `d${i}`, label: `D${i}`, values: i === 4 ? [null, null] : [10 + i, 5 + i] }));
    const { container } = render(<GroupedColumns grouped label="G" parts={parts} columns={columns} />);
    const none = container.querySelector('[data-column="d4"]')!;
    expect(none.querySelector('[data-value]')?.textContent).toBe('No data');
    expect(none.getAttribute('title')).toBe('No data');
  });

  it('a Trend chart draws no dot on its running point: nothing solid reaches a period still in progress', () => {
    const { container } = render(<TrendChart label="R" points running dates={dates} series={[{ key: 'r', label: 'R', values: [10, 20, 15, 5], kind: 'line' }]} />);
    expect(container.querySelectorAll('[data-point]')).toHaveLength(3);
  });

  it("an area held on a domain above zero names the range it was drawn from when it widens", () => {
    const { container } = render(<TrendChart label="A" domain={[20, 80]} dates={dates} series={[{ key: 'a', label: 'A', values: [30, 150, 40, 50], kind: 'area' }]} />);
    expect(container.querySelector('[data-widened]')?.textContent).toMatch(/^Scale widened from 0–80 to /);
  });

  it('a Diverging bars row takes a node for its label and names the row by its key where words are needed', () => {
    const { container } = render(<DivergingBars label="Change" domain={10} items={[{ key: 'api', label: <code>/v1/api</code>, value: 20 }, { key: 'web', label: 'Web', value: -4 }]} />);
    expect(container.querySelector('li[data-row="api"] code')?.textContent).toBe('/v1/api');
    expect(container.querySelector('[data-widened]')?.textContent).toBe('Scale widened to +20 to show api');
  });

  it('a Diverging bars row with no figure is not an estimate: no key, no word in its title', () => {
    const { container } = render(<DivergingBars label="Change" items={[{ key: 'a', label: 'A', value: null, estimate: true }, { key: 'b', label: 'B', value: 0, estimate: true }, { key: 'c', label: 'C', value: 5 }]} />);
    expect(container.querySelector('[data-estimate-key]')).toBeNull();
    expect(container.querySelector('li[data-row="a"]')?.getAttribute('title')).toBe('A · —');
    expect(container.querySelector('li[data-row="b"]')?.getAttribute('title')).toBe('B · 0');
  });

  it("an estimate's forced-colours fill wins over a mark's inline colour", () => {
    const css = readFileSync('src/styles/base.css', 'utf8');
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(/\[data-estimate\] \{[^}]*background-color: Canvas !important;/);
  });
});

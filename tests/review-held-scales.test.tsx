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
// running point, a node label on a diverging row, the widening words of an area held above zero, and the forced-colours
// fill of an estimate whose colour is an inline style.

const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];

describe('the forms of issue #99 on their edge paths', () => {
  it('a Bar list holds a max under one: every bar against it, no extra level, no widening', () => {
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    const { container } = render(<BarList label="Rates" max={0.5} axis format={pct} items={[{ key: 'a', label: 'A', value: 0.4 }, { key: 'b', label: 'B', value: 0.2 }]} />);
    expect([...container.querySelectorAll('[data-bar]')].map((b) => (b as HTMLElement).style.width)).toEqual(['80%', '40%']);
    expect([...container.querySelectorAll('[data-level]')].at(-1)?.textContent).toBe('50%');
    expect(container.querySelector('[data-widened]')).toBeNull();
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

  it("an estimate's forced-colours fill wins over a mark's inline colour", () => {
    const css = readFileSync('src/styles/base.css', 'utf8');
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(/\[data-estimate\] \{[^}]*background-color: Canvas !important;/);
  });
});

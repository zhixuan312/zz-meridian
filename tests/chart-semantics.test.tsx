import { act, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

// jsdom measures nothing, so every chart is given the width a browser would.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 240 }] as const };
});

import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { GroupedColumns } from '@/components/charts/column-chart/grouped';
import { CompositionBar } from '@/components/charts/composition-bar';
import { DivergingBars } from '@/components/charts/diverging-bars';
import { Heatmap } from '@/components/charts/heatmap';
import { Sparkline } from '@/components/charts/sparkline';
import { TrendChart } from '@/components/charts/trend-chart';
import { UptimeBars } from '@/components/charts/uptime-bars';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { MetricTile } from '@/components/patterns/metric-tile';
import { Delta } from '@/components/ui/delta';

/**
 * The shapes a product's data takes that the sample's never does: every chart and figure is drawn with each, and none
 * may print a number that is not one, size a mark by one, or throw. The sample is smooth, positive, daily and whole by
 * construction, so each of these reached an adopter first (#34, #35, #45, #60, #72, #73, #78, #80, #96).
 */
const SHAPES: Record<string, (number | null)[]> = {
  empty: [],
  one: [5],
  'all missing': [null, null, null, null],
  'all zero': [0, 0, 0, 0],
  'a gap': [4, null, 9, 6],
  'starts missing': [null, null, 3, 5],
  'ends missing': [3, 5, null, null],
  negative: [-3, -8, -1, -4],
  signed: [12, -8, 20, -35, 5],
  tiny: [1e-7, 3e-7, 2e-7, 4e-7],
  huge: [1.2e13, 9e12, 1.5e13, 1.1e13],
  'whole, top of one': [0, 1, 0, 1],
  outlier: [3, 4, 2, 5, 1771, 3],
  flat: [7, 7, 7, 7],
  'a year': Array.from({ length: 366 }, (_, i) => (i % 9) * 3 + (i % 4)),
};

const LONG = 'Median hours until abandoned work stopped, across every team and region';
const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const numbers = (v: (number | null)[]) => v.filter((n): n is number => n !== null);

/** Every way a chart or figure takes a series. Each is drawn with every shape. */
const DRAWN: Record<string, (v: (number | null)[]) => ReactElement> = {
  Sparkline: (v) => <Sparkline values={v} />,
  'Sparkline step, held': (v) => <Sparkline values={v} curve="step" domain={[0, 10]} />,
  'Sparkline linear': (v) => <Sparkline values={v} curve="linear" />,
  'TrendChart area': (v) => <TrendChart label={LONG} dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: LONG, values: v, kind: 'area' }]} />,
  'TrendChart whole': (v) => <TrendChart label="Count" whole dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: 'Count', values: v, kind: 'area' }]} />,
  'TrendChart stacked': (v) => <TrendChart label="Parts" stacked dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: 'One', values: v }, { key: 'b', label: 'Two', values: v.map((n) => (n === null ? null : n / 2)) }]} />,
  'TrendChart running': (v) => <TrendChart label="Weeks" running tick={(d) => `Week of ${d}`} dates={v.map((_, i) => day(i * 7))} series={[{ key: 'a', label: 'Weeks', values: v, kind: 'area' }]} />,
  'TrendChart step, held, points': (v) => <TrendChart label="Held" curve="step" points domain={[0, 10]} dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: 'Held', values: v, kind: 'area' }]} />,
  'TrendChart linear': (v) => <TrendChart label="Straight" curve="linear" running dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: 'Straight', values: v, kind: 'line' }]} />,
  'TrendChart stacked step': (v) => <TrendChart label="Parts" stacked curve="step" running dates={v.map((_, i) => day(i))} series={[{ key: 'a', label: 'One', values: v }, { key: 'b', label: 'Two', values: v.map((n) => (n === null ? null : n / 2)) }]} />,
  ColumnChart: (v) => <ColumnChart label={LONG} columns={v.map((value, i) => ({ key: `c${i}`, label: `W${i + 1}`, value }))} />,
  'ColumnChart whole running': (v) => <ColumnChart label="Count" whole running columns={v.map((value, i) => ({ key: `c${i}`, label: `W${i + 1}`, value }))} />,
  'ColumnChart highlighted': (v) => <ColumnChart label="Days" highlight="c0" highlightLabel="The first day" columns={v.map((value, i) => ({ key: `c${i}`, label: `D${i + 1}`, value }))} />,
  'ColumnChart stacked': (v) => (
    <ColumnChart
      label="Outcomes"
      parts={[{ key: 'a', label: 'Accepted', color: 1 }, { key: 'b', label: 'Delivered', color: 2 }]}
      columns={v.map((n, i) => ({ key: `c${i}`, label: `W${i + 1}`, values: [n, n === null ? null : n * 2] }))}
    />
  ),
  'ColumnChart grouped': (v) => (
    <GroupedColumns
      label="Flows"
      grouped
      parts={[{ key: 'a', label: 'In' }, { key: 'b', label: 'Out' }]}
      columns={v.map((n, i) => ({ key: `c${i}`, label: `W${i + 1}`, values: [n, n === null ? null : n / 2] }))}
    />
  ),
  'ColumnChart estimated': (v) => <ColumnChart label="Count" columns={v.map((value, i) => ({ key: `c${i}`, label: `W${i + 1}`, value, estimate: i % 2 === 1 }))} />,
  BarList: (v) => <BarList label="By row" items={numbers(v).map((value, i) => ({ key: `r${i}`, label: i === 0 ? LONG : `Row ${i}`, value }))} />,
  'BarList of a total': (v) => <BarList label="Share" total={numbers(v).reduce((a, b) => a + b, 0)} items={numbers(v).map((value, i) => ({ key: `r${i}`, label: `Row ${i}`, value }))} />,
  'BarList given, held, paired': (v) => <BarList label="By row" order="given" max={100} axis pair={{ label: 'This week', compareLabel: 'Last week' }} items={numbers(v).map((value, i) => ({ key: `r${i}`, label: i === 0 ? LONG : `Row ${i}`, value, compare: value / 2 }))} />,
  'BarList estimated': (v) => <BarList label="By row" items={numbers(v).map((value, i) => ({ key: `r${i}`, label: `Row ${i}`, value, estimate: i % 2 === 1 }))} />,
  DivergingBars: (v) => <DivergingBars label={LONG} items={v.map((value, i) => ({ key: `r${i}`, label: i === 0 ? LONG : `Row ${i}`, value }))} />,
  CompositionBar: (v) => <CompositionBar label="Parts" parts={numbers(v).slice(0, 6).map((value, i) => ({ label: i === 0 ? LONG : `Part ${i}`, value }))} />,
  'Heatmap hours': (v) => <Heatmap label="Load" values={Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => numbers(v)[(d * 24 + h) % Math.max(1, numbers(v).length)] ?? 0))} />,
  'Heatmap calendar': (v) => <Heatmap label="Days" days={numbers(v).map((value, i) => ({ date: day(i), value }))} />,
  'Heatmap quantile': (v) => <Heatmap label="Load" scale="quantile" values={Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => numbers(v)[(d * 24 + h) % Math.max(1, numbers(v).length)] ?? 0))} />,
  MetricTile: (v) => <MetricTile label={LONG} value={numbers(v).at(-1) ?? 0} delta={numbers(v)[0] ?? null} points={v} format="count" />,
  'MetricTile cost': (v) => <MetricTile label="Spend" value={numbers(v).at(-1) ?? 0} delta={numbers(v)[0] ?? null} points={v} format="cost" />,
  'MetricTile share': (v) => <MetricTile label="Share" value={numbers(v).at(-1) ?? 0} delta={numbers(v)[0] ?? null} deltaFormat="points" format="percent" />,
  FeaturedMetric: (v) => <FeaturedMetric kicker="Requests" value={v.at(-1) ?? null} points={v} delta={numbers(v)[0] ?? null} format={(n) => n.toLocaleString('en-US')} />,
  Delta: (v) => <>{v.map((n, i) => (n === null ? null : <Delta key={i} value={n} />))}</>,
  UptimeBars: (v) => <UptimeBars label="Uptime" end={new Date(Date.UTC(2026, 9, 2))} uptime={numbers(v)[0] ?? 0} days={v.map((n) => (n === null ? 'none' : n < 0 ? 'outage' : n === 0 ? 'degraded' : 'operational'))} />,
};

/** Draws, then flushes its effects. `useSettled` starts settled, so a fresh mount defers nothing to wait for. */
async function draw(el: ReactElement) {
  const r = render(el);
  await act(async () => {});
  return r.container;
}

/** Everything a reader or a screen reader is given: the text, every attribute that names something, every style. */
const said = (c: HTMLElement) => [c.textContent ?? '', ...[...c.querySelectorAll('*')].flatMap((n) => ['title', 'aria-label', 'aria-valuetext', 'style', 'd', 'x', 'y', 'width', 'height', 'cx', 'cy', 'points', 'transform'].map((a) => n.getAttribute(a) ?? ''))].join('\n');

/**
 * Every size below zero React sets on a mark. jsdom drops a negative width or height set through `style`, as a browser
 * does (which then draws the mark at its auto size), so no attribute keeps it: it is caught where React sets it.
 */
const below: string[] = [];
const styles = Object.getPrototypeOf(document.createElement('div').style);
for (const prop of ['width', 'height', 'minWidth', 'minHeight']) {
  const d = Object.getOwnPropertyDescriptor(styles, prop)!;
  Object.defineProperty(styles, prop, { ...d, set(v: unknown) { if (/^\s*-\d/.test(String(v))) below.push(`${prop}: ${v}`); d.set!.call(this, v); } });
}

/** A cell that says nothing but zero, in any unit: `0`, `$0`, `0.0%`, `0 pts`. */
const ZERO = /^[^\d]*0(?:\.0+)?(?:\s*[a-z%]+)?$/i;
/** The levels a chart names on its axis: the Column chart's tick spans, the Trend chart's axis text. */
const levels = (c: HTMLElement) => [...c.querySelectorAll('[data-tick], svg text.tabular-nums')].map((t) => t.textContent ?? '');

describe('every chart and figure, drawn with every shape a product’s data takes', () => {
  // A chart with a table names each point in a row of its own. A point with no data reads as no data there, never as
  // zero: the table is what a screen reader is given, and a zero there is a figure the product never measured.
  for (const name of Object.keys(DRAWN).filter((n) => /^(TrendChart|ColumnChart)/.test(n))) {
    for (const [shape, values] of Object.entries(SHAPES).filter(([, v]) => v.includes(null))) {
      it(`${name}, ${shape}: a point with no data reads as no data in the table, never as zero`, async () => {
        const c = await draw(DRAWN[name](values));
        const rows = [...c.querySelectorAll('table tbody tr')];
        expect(rows).toHaveLength(values.length);
        values.forEach((v, i) => {
          if (v !== null) return;
          const cells = [...rows[i].querySelectorAll('td')].slice(name.startsWith('Trend') ? 1 : 0).map((td) => (td.textContent ?? '').trim());
          for (const cell of cells) expect(cell, `row ${i + 1} reads "${cell}"`).not.toMatch(ZERO);
        });
      });
    }
  }
  // A chart of counts names whole levels only, whatever the counts are: a level at 0.5 or 2.5 is one no count stands at.
  for (const name of Object.keys(DRAWN).filter((n) => /whole/.test(n))) {
    for (const [shape, values] of Object.entries(SHAPES).filter(([, v]) => v.some((n) => n !== null && Number.isInteger(n)))) {
      it(`${name}, ${shape}: every level it names is a whole number`, async () => {
        const c = await draw(DRAWN[name](values));
        // A shortened level stands for its whole figure: 1.5K is 1,500.
        const figure = (l: string) => { const m = /(-?[\d.]+)\s*([KMBT]?)/i.exec(l.replace(/,/g, '')); return m ? Number(m[1]) * 10 ** (3 * ' KMBT'.indexOf((m[2] || ' ').toUpperCase())) : 0; };
        for (const l of levels(c)) expect(Number.isInteger(Math.round(figure(l) * 1e6) / 1e6), `the level "${l}"`).toBe(true);
      });
    }
  }
  for (const [name, drawn] of Object.entries(DRAWN)) {
    describe(name, () => {
      for (const [shape, values] of Object.entries(SHAPES)) {
        it(`${shape}: no number that is not one, and no mark sized by one`, async () => {
          below.length = 0;
          const c = await draw(drawn(values));
          const out = said(c);
          expect(out, 'a NaN, Infinity or undefined reached the page').not.toMatch(/\bNaN\b|Infinity|\bundefined\b/);
          // A size below zero draws nothing where a mark should be, flips it, or is dropped and draws it at its auto size.
          expect(out, 'a mark is sized below zero').not.toMatch(/(?:^|[;\s"])(?:height|width):\s*-\d/);
          expect(below, 'a mark is sized below zero').toEqual([]);
        });
      }
    });
  }
});

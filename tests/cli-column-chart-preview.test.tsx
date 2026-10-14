// Named cli-* so the payload leaves it out: it reads the Column chart's own preview and the sample's Usage page, which a product may not keep.
import { render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The specimens are drawn at a stated width, a desk's and a phone's: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import ColumnChartPreview from '@/components/charts/column-chart/preview';
import { UsageBody } from '@/views/usage';
import { usageTool } from '@/views/tools';

const charts = (c: HTMLElement) => [...c.querySelectorAll('[data-plot]')].map((p) => p.closest('figure') as HTMLElement);
const name = (chart: HTMLElement) => chart.getAttribute('aria-label')!;
/** What a tick's label says, as a number: "1.5K" is 1,500 and "$2M" two million. */
const said = (label: string) => {
  const m = label.match(/([\d,.]+)\s*([KMB]?)/)!;
  return Number(m[1].replace(/,/g, '')) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] ?? 1);
};
const ticks = (chart: HTMLElement) => [...chart.querySelectorAll('[data-tick]')].map((e) => said(e.textContent!)).sort((a, b) => a - b);
/** The ticks of a chart are equal steps from zero, so their labels are true only if what they say is equal steps too. */
const evenSteps = (xs: number[]) => xs.every((x, i) => Math.abs(x - i * xs[1]) <= xs[1] * 0.001);
/** The chart a specimen's state draws, found by the state's caption. */
const drawn = (caption: string) => screen.getByText(caption, { selector: 'figcaption' }).closest('figure')!.querySelector('[data-plot]')!.closest('figure') as HTMLElement;
const columns = (chart: HTMLElement) => [...chart.querySelectorAll<HTMLElement>('[data-column]')];
/** How tall a column is, as a share of the axis. */
const share = (column: HTMLElement) => parseFloat((column.firstElementChild as HTMLElement).style.height);

beforeEach(() => { size.width = 720; size.height = 0; });

describe('the Column chart\'s specimens: what they say is true', () => {
  it('label every tick with the value it stands at', () => {
    const { container } = render(<ColumnChartPreview />);
    expect(charts(container).length).toBeGreaterThan(10);
    for (const chart of charts(container)) {
      expect(ticks(chart)[0], name(chart)).toBe(0);
      expect(evenSteps(ticks(chart)), `${name(chart)}: ${[...chart.querySelectorAll('[data-tick]')].map((e) => e.textContent).join(' ')}`).toBe(true);
    }
  });

  it('give no two columns of plainly different heights the same value at rest', () => {
    const { container } = render(<ColumnChartPreview />);
    for (const chart of charts(container)) {
      const read = new Map<string, number[]>();
      for (const column of columns(chart)) {
        const value = column.querySelector('[data-value]')?.textContent;
        if (value) read.set(value, [...(read.get(value) ?? []), share(column)]);
      }
      // Two columns that read the same stand within two hundredths of the axis of each other.
      for (const [value, shares] of read) expect(Math.max(...shares) - Math.min(...shares), `${name(chart)}: "${value}"`).toBeLessThan(2);
    }
  });

  it('never cut a period\'s label on a phone: only the chart of categories cuts its labels to their columns', () => {
    size.width = 300;
    const { container } = render(<ColumnChartPreview />);
    const cut = charts(container).filter((chart) => chart.querySelector(':scope > div[aria-hidden]:not([data-plot]) .truncate'));
    expect(cut.map(name)).toEqual(['Requests by endpoint']);
  });
});

describe('the Column chart\'s specimens: every state is drawn', () => {
  it('draws the Tab stop focused, statically, with the ring the plot takes', () => {
    render(<ColumnChartPreview />);
    const chart = drawn('Focus');
    expect(chart.closest('[inert]')).not.toBeNull();
    for (const part of ['outline-2', 'outline-offset-4', 'outline-accent']) expect(chart.className).toContain(`[&_[data-plot]]:${part}`);
  });

  it('draws a highlighted column of a stacked chart, with nothing pointed at', () => {
    render(<ColumnChartPreview />);
    const chart = drawn('Highlighted, stacked');
    expect(chart.querySelector('[data-part]')).not.toBeNull();
    expect(chart.querySelector('[data-active]')).toBeNull();
    expect(chart.querySelector('[data-readout]')).toBeNull();
    expect(columns(chart).filter((c) => c.querySelector('.ring-2'))).toHaveLength(1);
  });

  it('draws a column of zero, plain and stacked', () => {
    render(<ColumnChartPreview />);
    const plain = columns(drawn('Plain: a day with no errors')).filter((c) => share(c) === 0);
    expect(plain).toHaveLength(1);
    expect(plain[0].querySelector('[data-value]')).toHaveTextContent(/^0$/);
    const stacked = columns(drawn('Stacked: a day with no requests, and a day with none from one region'));
    const none = stacked.filter((c) => share(c) === 0);
    expect(none).toHaveLength(1);
    expect(none[0].querySelector('[data-part]')).toBeNull();
    expect(none[0].querySelector('[data-value]')).toHaveTextContent(/^0$/);
    expect(stacked.filter((c) => c.querySelectorAll('[data-part]').length === 3)).toHaveLength(1);
  });

  it('draws more columns than a narrow card has room for, a year of days among them, and fixes no gap between them', () => {
    render(<ColumnChartPreview />);
    for (const [caption, count] of [['Ninety days in a narrow card: a pixel between columns', 90], ['A year of days in a narrow card: 360 columns, nothing between them', 360]] as const) {
      const chart = drawn(caption);
      expect(columns(chart), caption).toHaveLength(count);
      expect(chart.closest('.max-w-sm'), caption).not.toBeNull();
      // A fixed gap is what 360 columns cannot give up: 718px of a card 336px wide.
      for (const row of [columns(chart)[0].parentElement!, chart.querySelector(':scope > div[aria-hidden]:not([data-plot])')!]) {
        expect(row.className.split(' ').filter((name) => name.startsWith('gap-')), caption).toEqual([]);
      }
    }
  });

  it('draws a running column pointed at, with so far in the plain value and in the stacked readout', () => {
    render(<ColumnChartPreview />);
    const plain = drawn('Plain: the running day read');
    expect(plain.querySelector('[data-column][data-running][data-active]')).toHaveTextContent(/so far/);
    const stacked = drawn('Stacked: the running day read');
    expect(stacked.querySelector('[data-column][data-running][data-active]')).not.toBeNull();
    expect(stacked.querySelector('[data-readout]')).toHaveClass('opacity-100');
    expect(stacked.querySelector('[data-readout]')).toHaveTextContent(/so far/);
  });
});

describe('Usage\'s two Column charts', () => {
  it('label every tick with the value it stands at, on a week and on a month', async () => {
    for (const period of ['7d', '30d'] as const) {
      const { data } = await usageTool.read({ period });
      const { container, unmount } = render(<Tooltip.Provider><UsageBody {...data} /></Tooltip.Provider>);
      expect(charts(container).map(name)).toEqual(['Requests by hour of day', 'Errors per day']);
      for (const chart of charts(container)) expect(evenSteps(ticks(chart)), `${period} ${name(chart)}: ${[...chart.querySelectorAll('[data-tick]')].map((e) => e.textContent).join(' ')}`).toBe(true);
      unmount();
    }
  });
});

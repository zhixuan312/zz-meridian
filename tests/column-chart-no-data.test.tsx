import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart, type Column, type ColumnPart, type StackedColumn } from '@/components/charts/column-chart';

// A week in which nothing was called has no rate, which is not a rate of zero: its column keeps its slot and says so.
const weeks: Column[] = [
  { key: 'w1', label: '14 Sept', value: 12 },
  { key: 'w2', label: '21 Sept', value: null },
  { key: 'w3', label: '28 Sept', value: 0 },
];
const column = (c: HTMLElement, key: string) => c.querySelector<HTMLElement>(`[data-column="${key}"]`)!;
const cells = (c: HTMLElement, row: number) => [...c.querySelectorAll('table tbody tr')[row].querySelectorAll('td')].map((td) => td.textContent);
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]');
const plot = (name: RegExp) => screen.getByRole('group', { name });

describe('a column chart: a period with no data', () => {
  it('keeps the period\'s slot, draws no bar there, and reads No data, never zero', () => {
    const { container } = render(<ColumnChart label="Failed calls per 1,000" columns={weeks} />);
    expect(container.querySelectorAll('[data-column]')).toHaveLength(3);
    const none = column(container, 'w2');
    expect(none).toHaveAttribute('data-no-data');
    expect(none.querySelector('.bg-chart-neutral, .bg-accent')).toBeNull();
    expect(none.querySelector('.bg-fill-track')).not.toBeNull();
    expect(none.querySelector('[data-value]')).toHaveTextContent(/^No data$/);
    expect(cells(container, 1)).toEqual(['No data']);
    // A real zero is still a zero.
    expect(column(container, 'w3')).not.toHaveAttribute('data-no-data');
    expect(cells(container, 2)).toEqual(['0']);
  });

  it('reads No data when the period is pointed at, and takes the word the product passes', () => {
    const { container } = render(<ColumnChart label="Failed calls per 1,000" columns={weeks} noData="Not observed" />);
    fireEvent.keyDown(plot(/^Failed calls per 1,000/), { key: 'ArrowLeft' });
    expect(live(container)).toHaveTextContent(/^21 Sept: Not observed$/);
    expect(column(container, 'w2').querySelector('[data-value]')).toHaveTextContent(/^Not observed$/);
    expect(cells(container, 1)).toEqual(['Not observed']);
  });

  it('takes its scale from the periods that have data', () => {
    const ticks = (c: HTMLElement) => [...c.querySelectorAll('[data-tick]')].map((t) => t.textContent);
    const all = render(<ColumnChart label="Failed calls per 1,000" columns={weeks} />);
    const read = render(<ColumnChart label="Failed calls, the weeks read" columns={weeks.filter((w) => w.value !== null)} />);
    expect(ticks(all.container)).toEqual(ticks(read.container));
    expect(ticks(all.container)).toEqual(['0', '5', '10', '15']);
  });

  it('reads No data so far for a running period with no data', () => {
    const { container } = render(<ColumnChart label="Failed calls per 1,000" running columns={[...weeks.slice(0, 2), { key: 'w3', label: '28 Sept', value: null }]} />);
    const last = column(container, 'w3');
    expect(last).toHaveAttribute('data-running');
    expect(last.querySelector('[data-value]')).toHaveTextContent(/^No data so far$/);
    expect(cells(container, 2)).toEqual(['No data so far']);
    fireEvent.keyDown(plot(/^Failed calls per 1,000/), { key: 'End' });
    expect(live(container)).toHaveTextContent(/^28 Sept: No data so far$/);
    expect(last.querySelector('[data-value]')?.parentElement).toHaveTextContent(/^No data so far$/);
  });
});

describe('a stacked column chart: parts with no data', () => {
  const parts: ColumnPart[] = [{ key: 'us', label: 'US' }, { key: 'eu', label: 'EU' }, { key: 'ap', label: 'AP' }];
  const days: StackedColumn[] = [
    { key: 'd1', label: '01 Oct', values: [600, 300, 100] },
    { key: 'd2', label: '02 Oct', values: [null, null, null] },
    { key: 'd3', label: '03 Oct', values: [640, null, 60] },
  ];

  it('draws a column whose every part has no data as no data: no part, and No data in its row and its total', () => {
    const { container } = render(<ColumnChart label="Requests per day, by region" parts={parts} columns={days} />);
    const none = column(container, 'd2');
    expect(none).toHaveAttribute('data-no-data');
    expect(none.querySelector('[data-part]')).toBeNull();
    expect(none.querySelector('[data-value]')).toHaveTextContent(/^No data$/);
    expect(cells(container, 1)).toEqual(['No data', 'No data', 'No data', 'No data']);
  });

  it('reads a part with no data as No data, draws nothing for it, and totals the parts that were read', () => {
    const { container } = render(<ColumnChart label="Requests per day, by region" parts={parts} columns={days} data-preview-index={2} />);
    const some = column(container, 'd3');
    expect(some).not.toHaveAttribute('data-no-data');
    expect([...some.querySelectorAll('[data-part]')].map((p) => p.getAttribute('data-part'))).toEqual(['us', 'ap']);
    expect(cells(container, 2)).toEqual(['640', 'No data', '60', '700']);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('EUNo data');
  });

  it('reads every part of a running column with no data as No data so far, in the readout as in the table', () => {
    const running = [days[0], { key: 'd2', label: '02 Oct', values: [null, null, null] }];
    const { container } = render(<ColumnChart label="Requests per day, by region" running parts={parts} columns={running} data-preview-index={1} />);
    const readout = container.querySelector('[data-readout]')!;
    const amounts = [...readout.querySelectorAll('p')].slice(1).map((p) => p.querySelector('.t-num')?.textContent);
    expect(amounts).toEqual(['No data so far', 'No data so far', 'No data so far', 'No data so far']);
    expect(cells(container, 1)).toEqual(['No data so far', 'No data so far', 'No data so far', 'No data so far']);
  });

  it('reads a part with no data among parts read in a running column as No data', () => {
    const running = [days[0], { key: 'd3', label: '03 Oct', values: [640, null, 60] }];
    const { container } = render(<ColumnChart label="Requests per day, by region" running parts={parts} columns={running} data-preview-index={1} />);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('EUNo data');
    expect(container.querySelector('[data-readout]')).not.toHaveTextContent('EUNo data so far');
    expect(cells(container, 1)).toEqual(['640', 'No data', '60', '700']);
  });
});

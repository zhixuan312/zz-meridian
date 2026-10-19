import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A rule about a chart's width is tested at a stated width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart, type ColumnPart, type StackedColumn } from '@/components/charts/column-chart';

const models: ColumnPart[] = [{ key: 'large', label: 'Large' }, { key: 'swift', label: 'Swift' }, { key: 'embed', label: 'Embed' }];
const weeks: StackedColumn[] = [
  { key: 'w1', label: '14 Sept', values: [60, 30, 10] },
  { key: 'w2', label: '21 Sept', values: [40, 0, 20] },
  { key: 'w3', label: '28 Sept', values: [50, 20, 0] },
];
const column = (c: HTMLElement, key: string) => c.querySelector(`[data-column="${key}"]`)!;
const parts = (c: HTMLElement, key: string) => [...column(c, key).querySelectorAll('[data-part]')];
const keys = (c: HTMLElement, key: string) => parts(c, key).map((e) => e.getAttribute('data-part')).sort();
const legend = (c: HTMLElement) => [...c.querySelectorAll('[data-legend] li')].map((e) => e.textContent);
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]')!;
const plot = () => screen.getByRole('group', { name: /^Revenue by model/ });
const head = () => [...screen.getByRole('table').querySelectorAll('thead th')].map((e) => e.textContent);
const rows = () => [...screen.getByRole('table').querySelectorAll('tbody tr')];
const cells = (row: Element) => [...row.querySelectorAll('td')].map((e) => e.textContent);

beforeEach(() => { size.width = 720; size.height = 0; });

describe('stacked columns: the parts', () => {
  it('draw one part for each value that is not zero, and nothing for one that is', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect(container.querySelectorAll('[data-column]')).toHaveLength(3);
    expect(keys(container, 'w1')).toEqual(['embed', 'large', 'swift']);
    expect(keys(container, 'w2')).toEqual(['embed', 'large']);
    expect(keys(container, 'w3')).toEqual(['large', 'swift']);
  });

  it('keep a part that is not zero at least 3px tall', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={[{ key: 'w1', label: '14 Sept', values: [9990, 9, 1] }]} />);
    expect(parts(container, 'w1')).toHaveLength(3);
    for (const part of parts(container, 'w1')) expect((part as HTMLElement).style.minHeight).toBe('3px');
  });

  it('round the top of the topmost part drawn, and of no other', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    const top = (key: string) => parts(container, key).filter((e) => e.hasAttribute('data-top')).map((e) => e.getAttribute('data-part'));
    expect(top('w1')).toEqual(['embed']);
    expect(top('w2')).toEqual(['embed']);
    expect(top('w3')).toEqual(['swift']);
  });

  it('take the accent when no part has a tone', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect([...new Set(parts(container, 'w1').map((e) => e.getAttribute('data-tone')))]).toEqual(['accent']);
  });

  it('take their tones when the parts are outcomes, and never the accent beside a tone', () => {
    const outcomes: ColumnPart[] = [{ key: 'ok', label: 'Answered', tone: 'neutral' }, { key: 'late', label: 'Late', tone: 'warning' }, { key: 'failed', label: 'Failed', tone: 'critical' }];
    const a = render(<ColumnChart label="Revenue by model" parts={outcomes} columns={[{ key: 'w1', label: '14 Sept', values: [90, 7, 3] }]} />);
    const tone = (c: HTMLElement, part: string) => column(c, 'w1').querySelector(`[data-part="${part}"]`)!.getAttribute('data-tone');
    expect([tone(a.container, 'ok'), tone(a.container, 'late'), tone(a.container, 'failed')]).toEqual(['neutral', 'warning', 'critical']);
    a.unmount();
    const mixed: ColumnPart[] = [{ key: 'ok', label: 'Answered' }, { key: 'failed', label: 'Failed', tone: 'critical' }];
    const b = render(<ColumnChart label="Revenue by model" parts={mixed} columns={[{ key: 'w1', label: '14 Sept', values: [90, 10] }]} />);
    expect([tone(b.container, 'ok'), tone(b.container, 'failed')]).toEqual(['neutral', 'critical']);
  });

  it('fold the fourth and every later part into Other, in the marks, the legend and the table', () => {
    const six: ColumnPart[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((label) => ({ key: label.toLowerCase(), label }));
    const { container } = render(<ColumnChart label="Revenue by model" parts={six} columns={[{ key: 'w1', label: '14 Sept', values: [10, 20, 30, 40, 50, 60] }]} />);
    expect(keys(container, 'w1')).toEqual(['a', 'b', 'c', 'other']);
    expect(legend(container)).toEqual(['A', 'B', 'C', 'Other']);
    expect(head().slice(1)).toEqual(['A', 'B', 'C', 'Other', 'Total']);
    expect(cells(rows()[0])).toEqual(['10', '20', '30', '150', '210']);
  });

  it('draw four parts as four', () => {
    const four: ColumnPart[] = ['A', 'B', 'C', 'D'].map((label) => ({ key: label.toLowerCase(), label }));
    const { container } = render(<ColumnChart label="Revenue by model" parts={four} columns={[{ key: 'w1', label: '14 Sept', values: [10, 20, 30, 40] }]} />);
    expect(keys(container, 'w1')).toEqual(['a', 'b', 'c', 'd']);
    expect(legend(container)).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('stacked columns: what surrounds them', () => {
  it('scale the axis to the largest total, not the largest part', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect([...container.querySelectorAll('[data-tick]')].map((e) => e.textContent).sort((a, b) => Number(a) - Number(b))).toEqual(['0', '50', '100']);
  });

  it('name the parts in a legend, from the bottom of the stack, whenever there are two or more', () => {
    const a = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect(legend(a.container)).toEqual(['Large', 'Swift', 'Embed']);
    a.unmount();
    const b = render(<ColumnChart label="Revenue by model" parts={models.slice(0, 1)} columns={[{ key: 'w1', label: '14 Sept', values: [60] }]} />);
    expect(b.container.querySelector('[data-legend]')).toBeNull();
    b.unmount();
    const c = render(<ColumnChart label="Revenue by model" columns={[{ key: 'w1', label: '14 Sept', value: 60 }]} />);
    expect(c.container.querySelector('[data-legend]')).toBeNull();
  });

  it('write each column\'s total above it at rest while a column is at least 36px wide', () => {
    size.width = 400;
    const a = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect(['w1', 'w2', 'w3'].map((k) => column(a.container, k).querySelector('[data-value]')?.textContent)).toEqual(['100', '60', '70']);
    a.unmount();
    size.width = 100;
    const b = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect(b.container.querySelectorAll('[data-value]')).toHaveLength(0);
  });

  it('read a pointed column as its period, every part from the top down, and the total', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} format={(n) => `$${n}`} />);
    expect(container.querySelector('[data-readout]')).toBeNull();
    fireEvent.keyDown(plot(), { key: 'Home' });
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect([...container.querySelectorAll('[data-column][data-active]')].map((e) => e.getAttribute('data-column'))).toEqual(['w2']);
    const text = container.querySelector('[data-readout]')!.textContent!;
    const at = ['21 Sept', 'Embed', '$20', 'Swift', '$0', 'Large', '$40', 'Total', '$60'].map((s) => text.indexOf(s));
    expect(at.every((i) => i >= 0), text).toBe(true);
    expect([...at].sort((a, b) => a - b), text).toEqual(at);
    for (const s of ['21 Sept', 'Embed', 'Swift', 'Large', '$60']) expect(live(container)).toHaveTextContent(s);
    fireEvent.keyDown(plot(), { key: 'Escape' });
    expect(container.querySelector('[data-readout]')).toBeNull();
  });

  it('list every period in the table with each part and its total', () => {
    render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />);
    expect(screen.getByRole('table', { name: 'Revenue by model' })).toBeInTheDocument();
    expect(head().slice(1)).toEqual(['Large', 'Swift', 'Embed', 'Total']);
    expect(rows().map((r) => [r.querySelector('th')?.textContent, ...cells(r)])).toEqual([
      ['14 Sept', '60', '30', '10', '100'],
      ['21 Sept', '40', '0', '20', '60'],
      ['28 Sept', '50', '20', '0', '70'],
    ]);
  });

  it('mark a running last column as unfinished and say so far, in the readout and in the table', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={models} columns={weeks} running />);
    expect([...container.querySelectorAll('[data-column][data-running]')].map((e) => e.getAttribute('data-column'))).toEqual(['w3']);
    fireEvent.keyDown(plot(), { key: 'End' });
    expect(container.querySelector('[data-readout]')).toHaveTextContent(/so far/i);
    expect(live(container)).toHaveTextContent(/so far/i);
    fireEvent.keyDown(plot(), { key: 'Home' });
    expect(container.querySelector('[data-readout]')).not.toHaveTextContent(/so far/i);
    expect(rows()[2].querySelector('th')).toHaveTextContent(/so far/i);
    expect(rows()[0]).not.toHaveTextContent(/so far/i);
  });
});

describe('a stacked column chart whose parts are identities (#61)', () => {
  const outcomes: ColumnPart[] = [
    { key: 'accepted', label: 'Accepted', color: 1 },
    { key: 'delivered', label: 'Delivered', color: 2 },
    { key: 'abandoned', label: 'Abandoned', color: 3 },
  ];
  const closed: StackedColumn[] = [{ key: 'w1', label: '14 Sept', values: [4, 3, 1] }];
  const fill = (c: HTMLElement, key: string) => (column(c, 'w1').querySelector(`[data-part="${key}"]`) as HTMLElement).style.background;

  it('draws a part with a categorical slot in that slot, so two usual outcomes are told apart', () => {
    const { container } = render(<ColumnChart label="Closed initiatives per week" parts={outcomes} columns={closed} />);
    expect(fill(container, 'accepted')).toBe('var(--series-1)');
    expect(fill(container, 'delivered')).toBe('var(--series-2)');
    expect(fill(container, 'abandoned')).toBe('var(--series-3)');
    expect(column(container, 'w1').querySelector('[data-part="accepted"]')).toHaveAttribute('data-tone', 'series');
  });
  it('draws a part with neither a slot nor a tone beside categorical parts as the neutral, never the accent', () => {
    const teams: ColumnPart[] = [{ key: 'a', label: 'Core', color: 1 }, { key: 'b', label: 'Web', color: 2 }, { key: 'o', label: 'Other' }];
    const { container } = render(<ColumnChart label="Calls per week, by team" parts={teams} columns={[{ key: 'w1', label: '14 Sept', values: [5, 4, 2] }]} />);
    expect(fill(container, 'o')).toBe('var(--chart-neutral-strong)');
  });
  it('draws a part with neither beside a part that is the neutral as the quieter neutral, so two usual parts are told apart (#67)', () => {
    const refusals: ColumnPart[] = [{ key: 'platform', label: 'Platform failed', tone: 'critical' }, { key: 'malformed', label: 'Malformed call', tone: 'warning' }, { key: 'held', label: 'A guardrail held', tone: 'neutral' }, { key: 'other', label: 'Other' }];
    const { container } = render(<ColumnChart label="Refusals per week, by cause" parts={refusals} columns={[{ key: 'w1', label: '14 Sept', values: [1, 2, 6, 3] }]} />);
    expect(fill(container, 'held')).toBe('var(--chart-neutral-strong)');
    expect(fill(container, 'other')).toBe('var(--chart-neutral)');
    expect(column(container, 'w1').querySelector('[data-part="other"]')).toHaveAttribute('data-tone', 'neutral');
  });
});

import { act, render, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A rule about a chart's width is tested at a stated width: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 720, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart, type Column, type ColumnPart, type GroupedPart, type StackedColumn } from '@/components/charts/column-chart';

// FR-10 and FR-11 (AC-1.10, and AC-2.1 for the Column chart): the grouped form, and estimates in every form.

const flows: GroupedPart[] = [{ key: 'in', label: 'In' }, { key: 'out', label: 'Out' }];
const days: StackedColumn[] = [
  { key: 'd1', label: 'Mon', values: [120, 80] },
  { key: 'd2', label: 'Tue', values: [60, -30] },
  { key: 'd3', label: 'Wed', values: [90, null] },
];
const column = (c: HTMLElement, key: string) => c.querySelector(`[data-column="${key}"]`)!;
const part = (c: HTMLElement, key: string, p: string) => column(c, key).querySelector(`[data-part="${p}"]`);
const head = (c: HTMLElement) => [...c.querySelectorAll('table thead th')].map((e) => e.textContent);
const body = (c: HTMLElement) => [...c.querySelectorAll('table tbody tr')].map((r) => [...r.querySelectorAll('th, td')].map((e) => e.textContent));
const SHORTHAND = /(^|;)\s*background\s*:/;

/** Draws, then waits for what the chart draws late: the grouped form loads on demand, and the table follows a frame on. */
async function draw(el: React.ReactElement, columns: number) {
  const { container } = render(el);
  await waitFor(() => expect(container.querySelectorAll('[data-column]')).toHaveLength(columns));
  await act(() => new Promise((done) => setTimeout(done, 40)));
  await waitFor(() => expect(container.querySelector('table')).not.toBeNull());
  return container;
}
type Grouped = Partial<Omit<ComponentProps<typeof ColumnChart>, 'columns' | 'parts' | 'grouped'>>;
const grouped = (extra: Grouped = {}, columns: StackedColumn[] = days, parts: GroupedPart[] = flows) =>
  draw(<ColumnChart label="Flows by day" grouped parts={parts} columns={columns} {...extra} />, columns.length);

beforeEach(() => { size.width = 720; size.height = 0; });

describe('grouped columns', () => {
  it('draw each part of a column side by side in its own slot, in order or as named', async () => {
    const c = await grouped();
    expect(part(c, 'd1', 'in')?.getAttribute('style')).toMatch(/background-color:\s*var\(--series-1\)/);
    expect(part(c, 'd1', 'out')?.getAttribute('style')).toMatch(/background-color:\s*var\(--series-2\)/);
    const named = await grouped({}, days, [{ key: 'in', label: 'In', color: 4 }, { key: 'out', label: 'Out' }]);
    expect(part(named, 'd1', 'in')?.getAttribute('style')).toMatch(/var\(--series-4\)/);
  });

  it('draw a legend of the parts', async () => {
    const c = await grouped();
    expect([...c.querySelectorAll('[data-legend] li')].map((e) => e.textContent)).toEqual(['In', 'Out']);
  });

  it('list each part in the table and the readout, and carry no Total', async () => {
    const c = await grouped({ 'data-preview-index': 0 });
    expect(head(c)).toEqual(['Period', 'In', 'Out']);
    expect(body(c)[0]).toEqual(['Mon', '120', '80']);
    expect(c.querySelector('[aria-live="polite"]')?.textContent).toMatch(/In 120.*Out 80/);
    expect(c.textContent).not.toMatch(/Total/);
  });

  it('hang a part under zero from the zero line, and draw the no-data hairline in the slot of a part with no data', async () => {
    const c = await grouped();
    expect(part(c, 'd2', 'out')?.hasAttribute('data-fall')).toBe(true);
    expect(part(c, 'd2', 'in')?.hasAttribute('data-fall')).toBe(false);
    expect(part(c, 'd3', 'out')).toBeNull();
    expect(column(c, 'd3').querySelectorAll('[data-no-data-mark]')).toHaveLength(1);
    expect(column(c, 'd1').querySelectorAll('[data-no-data-mark]')).toHaveLength(0);
    expect(body(c)[2]).toEqual(['Wed', '90', 'No data']);
  });

  it('stand a part\'s value above it at rest while its bar is at least 36px wide, and "No data" over a part with none', async () => {
    const c = await grouped();
    expect(c.querySelectorAll('[data-value]')).toHaveLength(6);
    expect([...column(c, 'd3').querySelectorAll('[data-value]')].map((v) => v.textContent)).toEqual(['90', 'No data']);
    size.width = 220;
    expect((await grouped()).querySelectorAll('[data-value]')).toHaveLength(0);
  });

  it('ring a highlighted group in ink, and never draw the accent beside the slots', async () => {
    const c = await grouped({ highlight: 'd2', highlightLabel: 'The day of the refund' });
    expect(column(c, 'd2').querySelector('.ring-ink')).not.toBeNull();
    expect(column(c, 'd1').querySelector('.ring-ink')).toBeNull();
    expect(c.querySelector('.bg-accent')).toBeNull();
  });

  it('draw a running group at half strength inside one dashed outline, and say "so far"', async () => {
    const c = await grouped({ running: true });
    expect(column(c, 'd3').hasAttribute('data-running')).toBe(true);
    expect(column(c, 'd3').querySelectorAll('.border-dashed:not([data-no-data-mark])')).toHaveLength(1);
    expect(column(c, 'd3').querySelector('.opacity-50')).not.toBeNull();
    expect(body(c)[2][0]).toBe('Wed, so far');
  });

  it('refuse a tone on a grouped part, in its type', () => {
    // @ts-expect-error a grouped part is an identity, never an outcome's tone
    const toned = <ColumnChart label="Flows by day" grouped parts={[{ key: 'in', label: 'In', tone: 'warning' }]} columns={days} />;
    expect(toned).toBeTruthy();
  });
});

describe('estimates', () => {
  it('hatch every bar of an estimated group and say so', async () => {
    const c = await grouped({}, days.map((d) => ({ ...d, estimate: d.key === 'd1' })));
    for (const p of ['in', 'out']) {
      expect(part(c, 'd1', p)?.hasAttribute('data-estimate'), p).toBe(true);
      expect(part(c, 'd1', p)?.getAttribute('style') ?? '', p).not.toMatch(SHORTHAND);
    }
    expect(part(c, 'd2', 'in')?.hasAttribute('data-estimate')).toBe(false);
    expect(body(c)[0][0]).toMatch(/\bestimate\b/);
    expect(c.querySelector('[data-estimate-key]')?.textContent).toBe('Hatched: estimate');
  });

  it('hatch an estimated plain column, in the readout, the table and the key', async () => {
    const plain: Column[] = [{ key: 'a', label: 'A', value: 5, estimate: true }, { key: 'b', label: 'B', value: 7 }];
    const c = await draw(<ColumnChart label="Counts" columns={plain} data-preview-index={0} />, 2);
    expect(column(c, 'a').querySelector('[data-estimate]')).not.toBeNull();
    expect(column(c, 'b').querySelector('[data-estimate]')).toBeNull();
    expect(c.querySelector('[aria-live="polite"]')?.textContent).toMatch(/\bestimate\b/);
    expect(body(c)[0][0]).toMatch(/\bestimate\b/);
    expect(c.textContent?.match(/Hatched: estimate/g)).toHaveLength(1);
  });

  it('hatch an estimated column of a dense chart too', async () => {
    const many: Column[] = Array.from({ length: 40 }, (_, i) => ({ key: `c${i}`, label: `W${i + 1}`, value: 3 + (i % 5), estimate: i === 7 }));
    const c = await draw(<ColumnChart label="Counts" columns={many} />, 40);
    expect(column(c, 'c7').matches('[data-estimate]') || column(c, 'c7').querySelector('[data-estimate]') !== null).toBe(true);
  });

  it('hatch the parts of an estimated stacked column, and fill every stacked part with a background colour', async () => {
    const models: ColumnPart[] = [{ key: 'large', label: 'Large' }, { key: 'swift', label: 'Swift' }];
    const weeks: StackedColumn[] = [{ key: 'w1', label: '14 Sept', values: [60, 30], estimate: true }, { key: 'w2', label: '21 Sept', values: [40, 20] }];
    const c = await draw(<ColumnChart label="Revenue by model" parts={models} columns={weeks} />, 2);
    expect(column(c, 'w1').querySelectorAll('[data-part][data-estimate]')).toHaveLength(2);
    expect(column(c, 'w2').querySelectorAll('[data-part][data-estimate]')).toHaveLength(0);
    for (const p of c.querySelectorAll('[data-part]')) {
      expect(p.getAttribute('style') ?? '').toMatch(/background-color:/);
      expect(p.getAttribute('style') ?? '').not.toMatch(SHORTHAND);
    }
  });

  it('write nothing about estimates when no column is one', async () => {
    const c = await grouped();
    expect(c.querySelectorAll('[data-estimate]')).toHaveLength(0);
    expect(c.textContent).not.toMatch(/Hatched/);
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart, type ColumnPart, type StackedColumn } from '@/components/charts/column-chart';

const parts: ColumnPart[] = [{ key: 'us', label: 'US' }, { key: 'eu', label: 'EU' }, { key: 'ap', label: 'AP' }];
// The running day's top part is one request of a thousand: 3px tall, the least a part is drawn.
const stacked: StackedColumn[] = [{ key: 'd1', label: '01 Oct', values: [600, 300, 100] }, { key: 'd2', label: '02 Oct', values: [700, 350, 120] }, { key: 'd3', label: '03 Oct', values: [640, 359, 1] }];
const column = (c: HTMLElement, key: string) => c.querySelector(`[data-column="${key}"]`) as HTMLElement;
/** The dashed line that marks a column as unfinished. */
const dashed = (c: HTMLElement, key: string) => [...column(c, key).querySelectorAll<HTMLElement>('.border-dashed')];

describe('a column chart: how a period still running is drawn', () => {
  it('draws the dashed line around the parts, in space of its own, so it covers none of them', () => {
    const { container } = render(<ColumnChart label="Requests per day" parts={parts} columns={stacked} running />);
    expect(dashed(container, 'd3')).toHaveLength(1);
    const [line] = dashed(container, 'd3');
    expect(line.querySelectorAll('[data-part]')).toHaveLength(3);
    // The column is never shorter than its three parts, the hairlines between them and the line over them.
    expect(parseFloat((column(container, 'd3').firstElementChild as HTMLElement).style.minHeight)).toBeGreaterThanOrEqual(3 * 3 + 2 + 1);
  });

});

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { ColumnChart, type Column } from '@/components/charts/column-chart';
import { TrendChart, SO_FAR } from '@/components/charts/trend-chart';

// An accent, a ring, a dot on a stem and a dashed stretch are encodings of their own. A caption is read by a screen
// reader and a title only by a pointer, so a reader looking at the plot had to guess what they meant (#129).

const columns: Column[] = [
  { key: 'a', label: 'Mon', value: 42 },
  { key: 'b', label: 'Tue', value: 84 },
];
const dates = ['2026-10-01', '2026-10-02', '2026-10-03'];
const series = [{ key: 'r', label: 'Requests', values: [10, 20, 30], kind: 'line' as const }];

describe('a key a reader can see', () => {
  beforeEach(() => { size.width = 640; });

  it('names the highlighted column and what makes it the card’s subject, in a key under the plot', () => {
    const { container } = render(<ColumnChart columns={columns} label="Requests a day" highlight="b" highlightLabel="the day of the incident" />);
    expect(container.querySelector('[data-key]')?.textContent).toContain('the day of the incident');
    // The accent is what marks it on a plain chart; a stack or a group wears a ring instead, and the key says which.
    expect(container.querySelector('[data-key]')?.textContent).toMatch(/Accented|Ringed/);
  });

  it('draws no key when nothing is highlighted, and none for a label with no highlight to explain', () => {
    const plain = render(<ColumnChart columns={columns} label="Requests a day" />);
    expect(plain.container.querySelector('[data-key]')).toBeNull();
    const labelOnly = render(<ColumnChart columns={columns} label="Requests a day" highlightLabel="the day of the incident" />);
    expect(labelOnly.container.querySelector('[data-key]')).toBeNull();
  });

  it('names marked days in the legend, so a dot on a stem is not a shape to guess at', () => {
    const { container } = render(<TrendChart label="Requests a day" dates={dates} series={series} marks={{ dates: ['2026-10-02'], tone: 'warning', label: 'Above the ceiling' }} />);
    expect(container.querySelector('[data-key-mark]')?.textContent).toBe('Above the ceiling');
  });

  it('names the running stretch too, and keeps the legend even for one series, since the key needs it', () => {
    const { container } = render(<TrendChart label="Requests a day" dates={dates} series={series} running />);
    expect(container.querySelector('[data-key-running]')?.textContent).toBe(SO_FAR);
  });

  it('draws no mark key on a chart that has neither', () => {
    const { container } = render(<TrendChart label="Requests a day" dates={dates} series={series} />);
    expect(container.querySelector('[data-key-mark]')).toBeNull();
    expect(container.querySelector('[data-key-running]')).toBeNull();
  });
});

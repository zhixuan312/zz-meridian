import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart, type ColumnPart, type StackedColumn } from '@/components/charts/column-chart';
import { Meridian, usePointMeridian } from '@/components/charts/meridian';

const parts: ColumnPart[] = [{ key: 'large', label: 'Large' }, { key: 'swift', label: 'Swift' }];
const weeks: StackedColumn[] = [
  { key: 'w1', label: '14 Sept', values: [60, 30] },
  { key: 'w2', label: '21 Sept', values: [40, 20] },
  { key: 'w3', label: '28 Sept', values: [50, 25] },
];
const dates = ['2026-09-14', '2026-09-21', '2026-09-28'];
const active = (c: HTMLElement) => [...c.querySelectorAll('[data-column][data-active]')].map((e) => e.getAttribute('data-column'));

// A readout appears only on the chart being pointed at (docs/data-display.md): a chart that follows another chart's
// cursor marks the day and keeps its panel to itself, as the Trend chart does.
describe('a stacked column chart on the page\'s Meridian', () => {
  function Elsewhere() {
    const point = usePointMeridian();
    return <button type="button" onClick={() => point(dates[1])}>Point elsewhere</button>;
  }

  it('rings the day another chart points at and keeps its readout hidden, until it is pointed at itself', () => {
    const { container } = render(
      <Meridian dates={dates}>
        <ColumnChart label="Revenue by model" parts={parts} columns={weeks} dates={dates} />
        <Elsewhere />
      </Meridian>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Point elsewhere' }));
    expect(active(container)).toEqual(['w2']);
    expect(container.querySelector('[data-readout]')).toHaveClass('opacity-0');
    fireEvent.keyDown(screen.getByRole('group', { name: /^Revenue by model/ }), { key: 'ArrowRight' });
    expect(active(container)).toEqual(['w3']);
    expect(container.querySelector('[data-readout]')).toHaveClass('opacity-100');
    fireEvent.blur(screen.getByRole('group', { name: /^Revenue by model/ }));
    expect(container.querySelector('[data-readout]')).toBeNull();
  });

  it('draws a pointed column with its readout in a specimen, through the Atlas-only index', () => {
    const { container } = render(<ColumnChart label="Revenue by model" parts={parts} columns={weeks} data-preview-index={1} />);
    expect(active(container)).toEqual(['w2']);
    expect(container.querySelector('[data-readout]')).toHaveClass('opacity-100');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('21 Sept');
  });
});

import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 640, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { Meridian, usePointMeridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart } from '@/components/charts/column-chart';
// The Column chart loads its grouped form on demand; the form itself is what draws.
import { GroupedColumns } from '@/components/charts/column-chart/grouped';

const dates = Array.from({ length: 90 }, (_, i) => new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10));
const values = dates.map((_, i) => 100 + i);

/** Moves the page's cursor as a pointer over any chart on it would. */
function Pointer() {
  const point = usePointMeridian();
  return <>{[10, 11].map((i) => <button key={i} type="button" onClick={() => point(dates[i])}>{`Point at ${i}`}</button>)}</>;
}
const point = (i: number) => fireEvent.click(screen.getByRole('button', { name: `Point at ${i}` }));

/**
 * Pointing at a day re-renders every chart on the Meridian. The screen-reader table under each holds one row per date
 * and none of them changes with the cursor, so moving it formats the reading on the cursor alone, not every row again.
 */
describe('a chart\'s data table, as the cursor moves', () => {
  // What a move may still format: the reading on the cursor, and for the Column chart each column's own figure, as the
  // columns redraw to show which one is pointed at. Before the tables were memoised, a move formatted 101 values on the
  // Trend chart and 187 on the Column chart: every one of the 90 rows again.
  const charts: Record<string, [(format: (n: number) => string) => React.ReactNode, number]> = {
    'Trend chart': [(format: (n: number) => string) => <TrendChart label="Requests" dates={dates} series={[{ key: 'r', label: 'Requests', values }]} format={format} />, 20],
    'Column chart': [(format: (n: number) => string) => <ColumnChart label="Requests" dates={dates} columns={dates.map((d, i) => ({ key: d, label: d, value: values[i] }))} format={format} />, dates.length + 20],
    'Grouped column chart': [(format: (n: number) => string) => <GroupedColumns grouped label="Requests" dates={dates} parts={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]} columns={dates.map((d, i) => ({ key: d, label: d, values: [values[i], values[i] / 2] }))} format={format} />, 20],
  };
  for (const [name, [draw, most]] of Object.entries(charts)) {
    it(`${name}: is not formatted again`, () => {
      const format = vi.fn((n: number) => String(n));
      render(<Meridian dates={dates}><Pointer />{draw(format)}</Meridian>);
      expect(document.querySelectorAll('table.sr-only tbody tr')).toHaveLength(dates.length);
      point(10);
      format.mockClear();
      point(11);
      expect(format.mock.calls.length).toBeLessThan(most);
    });
  }
});

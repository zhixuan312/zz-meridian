// Named cli-* so the payload leaves it out: it reads the Column chart's own preview, which a product may not keep.
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import ColumnChartPreview from '@/components/charts/column-chart/preview';

// I-14 finding 6: the grouped form's pointed state is drawn statically, as the stacked and plain ones are: the ink
// ring, a readout of each part and no Total, and the estimate it reads.

describe('the Column chart\'s pointed specimens', () => {
  it('draw a grouped column pointed at, its readout naming each part and the estimate', async () => {
    render(<ColumnChartPreview />);
    const section = screen.getByRole('heading', { name: 'A column pointed at' }).closest('section')!;
    const chart = await waitFor(() => {
      const c = section.querySelector<HTMLElement>('[data-grouped]');
      expect(c).not.toBeNull();
      return c!;
    });
    expect(chart.querySelector('[data-active] .ring-ink')).not.toBeNull();
    const readout = chart.querySelector('[data-readout]')!;
    expect(readout.textContent).toMatch(/ · estimate/);
    expect(readout.textContent).toMatch(/This week.*Last week/);
    expect(readout.textContent).not.toMatch(/Total/);
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 0 }] as const };
});

import { ColumnChart } from '@/components/charts/column-chart';

const ticks = (c: HTMLElement) => [...c.querySelectorAll('[data-tick]')].map((t) => t.textContent);

describe('a column chart of counts (#72)', () => {
  it('draws whole levels only: a top of 1 is 0 and 1, with no level at 0.5', () => {
    const columns = [{ key: 'a', label: 'Mon', value: 0 }, { key: 'b', label: 'Tue', value: 1 }];
    expect(ticks(render(<ColumnChart label="Incidents opened" whole columns={columns} />).container)).toEqual(['0', '1']);
    expect(ticks(render(<ColumnChart label="Incidents opened, as a rate" columns={columns} />).container)).toEqual(['0', '0.5', '1']);
  });
});

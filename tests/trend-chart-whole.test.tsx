import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 640, height: 0 }] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';

const dates = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
/** The levels' labels: the axis text beside each gridline. */
const levels = (c: HTMLElement) => [...c.querySelectorAll('svg g > line + text')].map((t) => t.textContent);

describe('a trend chart of counts (#73)', () => {
  it('draws whole levels only, a running total of ten as a line or as a stack', () => {
    const made = render(<TrendChart label="Items in all" whole dates={dates} series={[{ key: 'n', label: 'Items', values: [2, 5, 7, 10], kind: 'line' }]} />);
    expect(levels(made.container).every((t) => /^\d+$/.test(t ?? ''))).toBe(true);
    expect(levels(made.container)).not.toContain('2.5');
    made.unmount();
    const stack = render(<TrendChart label="Items in all, by team" whole stacked dates={dates} series={[{ key: 'a', label: 'Core', values: [1, 3, 4, 6] }, { key: 'b', label: 'Web', values: [1, 2, 3, 4] }]} />);
    expect(levels(stack.container).every((t) => /^\d+$/.test(t ?? ''))).toBe(true);
  });
  it('keeps halves without it, for a quantity that is not a count', () => {
    const { container } = render(<TrendChart label="Hours waited" dates={dates} series={[{ key: 'n', label: 'Hours', values: [2, 5, 7, 10], kind: 'line' }]} />);
    expect(levels(container)).toContain('2.5');
  });
});

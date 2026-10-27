import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// A chart draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 480, height: 200 }] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';

// FR-6, begun in Phase 0: the chart draws its lines straight when asked, and exactly as it always has when not.

const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
type Extra = Partial<ComponentProps<typeof TrendChart>>;
function draw(kind: 'line' | 'area', extra: Extra = {}, values: (number | null)[] = [10, 40, 25, 25, 5]) {
  const { container } = render(<TrendChart label="Readings" dates={dates} series={[{ key: 'r', label: 'Reading', values, kind }]} {...extra} />);
  return container;
}
/** Every path the plot draws through the data: those of the chart's own svg with a stretch after their first point. */
const strokes = (c: HTMLElement) =>
  [...c.querySelectorAll('svg[role="img"] path')].map((p) => p.getAttribute('d') ?? '').filter((d) => /[LCHV]/.test(d));

describe('a trend chart\'s curve', () => {
  it('draws exactly today\'s smooth curve when no curve is given', () => {
    for (const kind of ['line', 'area'] as const) {
      const today = strokes(draw(kind));
      expect(today.length, kind).toBeGreaterThan(0);
      expect(today.some((d) => d.includes('C')), kind).toBe(true);
      expect(strokes(draw(kind, { curve: 'monotone' })), kind).toEqual(today);
    }
  });

  it('draws straight segments with curve="linear", for a line and an area', () => {
    for (const kind of ['line', 'area'] as const) {
      const straight = strokes(draw(kind, { curve: 'linear' }));
      expect(straight.length, kind).toBeGreaterThan(0);
      expect(straight.filter((d) => d.includes('C')), kind).toEqual([]);
      expect(straight.some((d) => d.includes('L')), kind).toBe(true);
    }
  });

  it('still breaks a straight line at a missing day', () => {
    const straight = strokes(draw('line', { curve: 'linear' }, [10, 40, null, 25, 5]));
    expect(straight.filter((d) => d.includes('C'))).toEqual([]);
    expect(straight.some((d) => (d.match(/M/g) ?? []).length >= 2)).toBe(true);
  });

  it('draws the running stretch straight too', () => {
    const c = draw('line', { curve: 'linear', running: true });
    const tail = c.querySelector('path[data-running]');
    expect(tail).not.toBeNull();
    expect(tail!.getAttribute('d')).not.toContain('C');
    expect(strokes(c).filter((d) => d.includes('C'))).toEqual([]);
  });
});

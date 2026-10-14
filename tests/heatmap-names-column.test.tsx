import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 800, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import { Heatmap } from '@/components/charts/heatmap';

const week = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => 100 + d * 24 + h));
const DAY = 86_400_000;
const days = Array.from({ length: 364 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 6) + i * DAY).toISOString().slice(0, 10), value: 100 + i }));

/**
 * The weekday names' column is drawn at the width the fit of the cells is worked out with, 40px. A rem is 14px here, so a
 * column given in rem draws narrower than the cells were fitted to.
 */
describe("a heatmap's weekday column", () => {
  it.each([
    ['a week of hours', () => <Heatmap label="Requests by weekday and hour" values={week} />],
    ['a calendar of days', () => <Heatmap label="Requests a day" days={days} />],
  ])('is 40px in %s', (_, draw) => {
    const { container } = render(draw());
    const grids = [...container.querySelectorAll<HTMLElement>('[class*="grid-cols-["]')].map((e) => /grid-cols-\[([^_\]]+)_/.exec(e.className)?.[1]);
    expect(grids.length).toBeGreaterThan(0);
    expect(new Set(grids)).toEqual(new Set(['40px']));
  });
});

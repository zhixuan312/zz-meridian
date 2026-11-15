// A series that dips under zero was drawn on `niceTicks`, which always starts at 0: the lowest labelled level was 0 while
// the line went to -380, so half the plot carried no label at all. The "Straight lines over a number" specimen in the
// Atlas draws exactly that shape.
import { render } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 720, height: 240 }] as const };
});
import { describe, expect, it } from 'vitest';
import { XYLineChart } from '@/components/charts/xy-line-chart';

const share = (n: number) => `${Math.round(n * 100)}%`;
const draw = (points: { x: number; y: number }[]) => render(
  <XYLineChart label="Asks" series={[{ key: 'ask', label: 'Asks', points }]} xLabel="Price, ms" yLabel="Change" xFormat={(n) => `${n}`} format={share} />,
);
const levels = (container: HTMLElement) => [...container.querySelectorAll('svg text')].map((t) => t.textContent ?? '');

describe('a line that dips under zero', () => {
  it('is drawn on levels that go below zero, so every part of it is read against a label', () => {
    const { container } = draw([{ x: -80, y: -0.380 }, { x: 0, y: -0.12 }, { x: 80, y: -0.01 }]);
    const shown = levels(container);
    // -38% is the lowest value; the axis must reach it rather than stop at 0%.
    expect(shown.some((t) => t.startsWith('-'))).toBe(true);
    expect(shown.some((t) => t === '-40%' || t === '-38%')).toBe(true);
  });

  it('keeps a series that never goes negative on its zero-based scale', () => {
    const { container } = draw([{ x: 0, y: 0.2 }, { x: 80, y: 0.9 }]);
    const shown = levels(container);
    expect(shown).toContain('0%');
    expect(shown.some((t) => t.startsWith('-'))).toBe(false);
  });
});

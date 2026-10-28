// Named cli-* so the payload leaves it out: it reads the Trend chart's own preview, which draws the sample.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The specimens are drawn at a stated width: the size hook is replaced.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 880, height: 0 }] as const };
});

import TrendChartPreview from '@/components/charts/trend-chart/preview';

const section = (name: string) => screen.getByRole('heading', { name }).closest('section')!;
const paths = (s: Element) => [...s.querySelectorAll('svg[role="img"] path')].map((p) => p.getAttribute('d') ?? '').filter((d) => /[LCHV]/.test(d));

describe('the Trend chart\'s specimens: steps, points and a held scale', () => {
  it('draws "Steps" level and upright, with no curve', () => {
    render(<TrendChartPreview />);
    const drawn = paths(section('Steps'));
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((d) => d.includes('C'))).toEqual([]);
    expect(drawn.some((d) => /H[-\d.]+V/.test(d))).toBe(true);
  });

  it('draws a dot on each reading of "Points"', () => {
    render(<TrendChartPreview />);
    expect(section('Points').querySelectorAll('[data-point]').length).toBeGreaterThan(1);
  });

  it('holds "A held scale" without words, and says "A held scale, widened"', () => {
    render(<TrendChartPreview />);
    expect(section('A held scale').querySelector('[data-widened]')).toBeNull();
    expect(section('A held scale, widened').querySelector('[data-widened]')?.textContent).toMatch(/^Scale widened from /);
  });
});

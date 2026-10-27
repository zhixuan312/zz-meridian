// Named cli-* so the payload leaves it out: it reads the Trend chart's own preview, which draws the sample.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The specimens are drawn at a stated width: the size hook is replaced.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 880, height: 0 }] as const };
});

import TrendChartPreview from '@/components/charts/trend-chart/preview';

describe('the Trend chart\'s specimens: straight lines', () => {
  it('heads a specimen "Straight lines" whose chart draws no curve', () => {
    render(<TrendChartPreview />);
    const section = screen.getByRole('heading', { name: 'Straight lines' }).closest('section')!;
    const paths = [...section.querySelectorAll('svg[role="img"] path')].map((p) => p.getAttribute('d') ?? '').filter((d) => /[LCHV]/.test(d));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((d) => d.includes('C'))).toEqual([]);
  });
});

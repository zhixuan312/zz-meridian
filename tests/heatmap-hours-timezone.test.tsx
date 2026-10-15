import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 800, height: 0 }] as const };
});

import { Heatmap } from '@/components/charts/heatmap';

const week = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => 100 + d * 24 + h));
const hours = () => screen.getByRole('group', { name: /^Requests by weekday and hour/ });

describe('a heatmap of hours names the timezone its hours are in', () => {
  it('names the timezone it is given in the readout, the announcement and the table', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} timezone="Asia/Singapore" />);
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    expect(container.querySelector('[data-readout]')).toHaveTextContent(/^100 requests · Mon 00:00 Asia\/Singapore$/);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(/^Mon 00:00 Asia\/Singapore: 100 requests$/);
    expect(container.querySelector('table thead th')).toHaveTextContent(/^Day \(Asia\/Singapore\)$/);
    expect(container).not.toHaveTextContent('UTC');
  });

  it('names UTC when it is given none', () => {
    const { container } = render(<Heatmap label="Requests by weekday and hour" values={week} />);
    fireEvent.keyDown(hours(), { key: 'ArrowRight' });
    expect(container.querySelector('[data-readout]')).toHaveTextContent(/^100 requests · Mon 00:00 UTC$/);
    expect(container.querySelector('table thead th')).toHaveTextContent(/^Day \(UTC\)$/);
  });
});

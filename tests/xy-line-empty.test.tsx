// The "Nothing measured" specimen: a chart with no points. The component drew Infinity ticks under a NaN plot instead of
// leaving the card's Empty state to say it — `xy-line-chart/README.md:44` is "No points | Render the card's Empty state".
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { XYLineChart } from '@/components/charts/xy-line-chart';

const share = (n: number) => `${Math.round(n * 100)}%`;

describe('a line chart with no points', () => {
  it('draws nothing at all, rather than an axis of Infinity and a plot of NaN', () => {
    const { container } = render(<XYLineChart label="Nothing measured" series={[{ key: 'x', label: 'Answered within', points: [] }]} xLabel="Latency, ms" yLabel="Share" xFormat={(n) => `${n} ms`} format={share} />);
    expect(container.innerHTML).toBe('');
  });

  it('draws the chart as soon as one series has a point', () => {
    const { container } = render(<XYLineChart label="One point" series={[{ key: 'x', label: 'Answered within', points: [{ x: 40, y: 0.5 }] }]} xLabel="Latency, ms" yLabel="Share" xFormat={(n) => `${n} ms`} format={share} />);
    expect(container.querySelector('figure')).not.toBeNull();
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
  });
});

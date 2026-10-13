import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The Sparkline draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 160, height: 28 }] }));

import { MetricTile } from '@/components/patterns/metric-tile';

const points = [3, 5, 4, 6, 8, 7, 9];
const usd = (n: number) => `$${(n / 1000).toFixed(1)}K`;
const compact = (c: HTMLElement) => c.querySelector('[data-size="compact"]')!;

/** What the compact size does with a part it is not given, and with one too long for a tile two to a row on a phone. */
describe('a compact metric tile: what is missing, and what is long', () => {
  it('draws no Sparkline without points, and none from a single point', () => {
    for (const given of [undefined, [5]]) {
      const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} note="Scale" points={given} />);
      expect(compact(container).querySelector('svg[width="160"]')).toBeNull();
      expect(compact(container).querySelector('[data-line]')).toHaveTextContent('$41.2K · Scale');
    }
  });

  it('draws no change when it is given none, and neither the words it would be measured against', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} compare="vs last week" note="Scale" points={points} />);
    expect(compact(container)).not.toHaveTextContent('vs last week');
    expect(compact(container)).not.toHaveTextContent('%');
  });

  it('says the change and then what it is against', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} compare="vs last week" note="Scale" points={points} />);
    expect(compact(container)).toHaveTextContent(/Northwind Labs.*12\.0%.*vs last week.*\$41\.2K · Scale/);
  });

  it('draws a dash where there is no earlier period, and says so to a screen reader', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={null} compare="vs last week" />);
    expect(compact(container)).toHaveTextContent('—');
    expect(compact(container).querySelector('.sr-only')).toHaveTextContent('No earlier period to compare');
    expect(compact(container)).not.toHaveTextContent('vs last week');
  });

  it('is the figure alone on its line without a note, and a word as it is', () => {
    const figure = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} />).container;
    expect(figure.querySelector('[data-line]')!.textContent).toBe('$41.2K');
    const word = render(<MetricTile size="compact" label="Tessellate" value="On a trial" note="Starter" />).container;
    expect(word.querySelector('[data-line]')!.textContent).toBe('On a trial · Starter');
  });

  it('keeps the whole of a name and of a line that a narrow tile cuts, in their titles', () => {
    const { container } = render(<MetricTile size="compact" label="Mosaic Learning of North America" value={41200} format={usd} note="Scale, billed yearly" />);
    expect(compact(container).querySelector('h2')).toHaveAttribute('title', 'Mosaic Learning of North America');
    expect(compact(container).querySelector('[data-line]')).toHaveAttribute('title', '$41.2K · Scale, billed yearly');
  });
});

describe('a metric tile of the default size: fewer than two points', () => {
  it('draws no Sparkline and is laid out as a tile given none', () => {
    const { container } = render(<MetricTile label="Requests" value={42} points={[42]} />);
    expect(container.querySelector('svg[width="160"]')).toBeNull();
    expect(container.querySelector('[data-value]')).toHaveTextContent('42');
  });
});

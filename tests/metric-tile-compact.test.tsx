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

  // Down a wall the words would stand eight times, and on a narrow one they fitted beside a change of one digit and not
  // beside one of two. The card that holds the wall says what the change is against; a tile draws the figure.
  it('draws the change\'s figure and not the words it is against, which a screen reader still hears after it', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} compare="vs last week" note="Scale" points={points} />);
    const tile = compact(container);
    const drawn = tile.cloneNode(true) as HTMLElement;
    drawn.querySelectorAll('.sr-only').forEach((hidden) => hidden.remove());
    expect(drawn).toHaveTextContent('12.0%');
    expect(drawn).not.toHaveTextContent('vs last week');
    expect(tile.querySelector('[title="vs last week"]')).toBeNull();
    expect(tile).toHaveTextContent(/Northwind Labs.*12\.0%.*vs last week.*\$41\.2K · Scale/);
  });

  it('says what the change is against by default too, to a screen reader only', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} />);
    const heard = [...compact(container).querySelectorAll('.sr-only')].map((hidden) => hidden.textContent!.trim());
    expect(heard).toContain('vs previous period');
  });

  it('keeps no room for the words: the line has the tile\'s whole width under the name and the change', () => {
    const { container } = render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} compare="vs last week" note="Scale" />);
    const tile = compact(container);
    // Side by side, the name and the change share the first row and the line spans both columns of the second.
    expect(tile.querySelector('[data-line]')!.className).toContain('col-span-2');
    expect(tile.querySelector('[class*="max-w-"]')).toBeNull();
    expect(tile.querySelector('[class*="flex-wrap"]')).toBeNull();
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

// A container query measures the container's content box. The tile's root has the Card's hairline, and it once had the
// side padding too, so "14rem of the tile" was really 14rem plus 34px and a desk's wall drew the phone's layout. A
// browser proves the widths; this holds the structure they depend on.
describe('a compact metric tile: what its layout measures', () => {
  const tile = () => compact(render(<MetricTile size="compact" label="Northwind Labs" value={41200} format={usd} delta={0.12} note="Scale" points={points} />).container);
  const has = (el: Element, token: RegExp) => el.className.split(/\s+/).some((c) => token.test(c));

  it('is measured by an element with no padding of its own, straight inside the root', () => {
    const root = tile();
    expect(has(root, /^@container$/)).toBe(false);
    expect(has(root, /^p[xytblr]?-(?!0$)/)).toBe(false);
    const measured = root.querySelector('[class~="@container"]')!;
    expect(measured.parentElement).toBe(root);
    expect(has(measured, /^p[xytblr]?-/)).toBe(false);
    expect(measured.querySelector('[data-line]')).not.toBeNull();
  });

  it('steps at 14rem of the tile, less only the hairline on each side that the measure leaves out', () => {
    const steps = new Set([...tile().querySelectorAll('*')].flatMap((el) => [...String(el.getAttribute('class') ?? '').matchAll(/@min-\[([^\]]+)\]:/g)].map((m) => m[1])));
    expect([...steps]).toEqual(['calc(14rem-2px)']);
  });
});

describe('a metric tile of the default size: fewer than two points', () => {
  it('draws no Sparkline and is laid out as a tile given none', () => {
    const { container } = render(<MetricTile label="Requests" value={42} points={[42]} />);
    expect(container.querySelector('svg[width="160"]')).toBeNull();
    expect(container.querySelector('[data-value]')).toHaveTextContent('42');
  });
});

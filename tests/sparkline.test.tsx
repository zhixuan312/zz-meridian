import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sparkline } from '@/components/charts/sparkline';

// jsdom measures nothing: a real ResizeObserver never fires, so `useSize` stays at width 0 and the chart draws no SVG
// at all — the defect this file is about would be invisible. The stub gives the chart a width, which is what a browser
// does, so a regression draws real geometry here rather than nothing.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 120, height: 36 }] }));

describe('Sparkline', () => {
  it('draws nothing under two values, instead of a path closed over a degenerate span', () => {
    // One value: `Math.min()` and `Math.max()` agree, so `span` is 0 and every point lands on the same spot — the area
    // path closed into a stray filled triangle in the card's corner. No values at all is worse: the two are ±Infinity.
    // A figure with no shape to draw stands alone.
    for (const values of [[], [5]]) {
      const { container } = render(<Sparkline values={values} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('draws a finite area and a finite line from two values on', () => {
    const { container } = render(<Sparkline values={[4, 9, 6]} />);
    const paths = [...container.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
    expect(paths).toHaveLength(2);
    for (const d of paths) {
      expect(d).not.toMatch(/Infinity|NaN/);
      expect(d.length).toBeGreaterThan(0);
    }
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Meridian } from '@/components/charts/meridian';
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

  // The cursor is the hairline and the dot. It is the page's, so it is drawn only for values that are the page's: one
  // for each of the Meridian's dates. Fourteen days of a customer on a page of thirty marked the wrong day.
  const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  const cursor = (c: HTMLElement) => [c.querySelector('svg line'), c.querySelector('svg circle')];

  it('marks the pointed day when it has a value for each of the page\'s dates', () => {
    const { container } = render(<Meridian dates={dates} day={dates[2]}><Sparkline values={[4, 9, 6, 7]} /></Meridian>);
    for (const mark of cursor(container)) expect(mark).not.toBeNull();
  });

  it('draws no cursor for values that are not the page\'s, fewer or more, and none outside a Meridian', () => {
    for (const values of [[4, 9, 6], [4, 9, 6, 7, 8]]) {
      const { container } = render(<Meridian dates={dates} day={dates[2]}><Sparkline values={values} /></Meridian>);
      expect(container.querySelector('svg path')).not.toBeNull();
      for (const mark of cursor(container)) expect(mark).toBeNull();
    }
    for (const mark of cursor(render(<Sparkline values={[4, 9, 6, 7]} />).container)) expect(mark).toBeNull();
  });
});

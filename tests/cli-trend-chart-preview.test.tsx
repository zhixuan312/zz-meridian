// Named cli-* so the payload leaves it out: it reads the Trend chart's own preview, which draws the sample.
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The specimens are drawn at a stated width, the Atlas at a desk and on a phone: the size hook is replaced.
const size = vi.hoisted(() => ({ width: 880, height: 0 }));
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), size] as const };
});

import TrendChartPreview from '@/components/charts/trend-chart/preview';

const num = (el: Element, name: string) => Number(el.getAttribute(name));
/** A baseline: the one dashed level line of a plot. */
const dash = (chart: Element) => chart.querySelector('line[stroke-dasharray][shape-rendering]');
/** The charts that draw what is usual. */
const charts = (c: HTMLElement) => [...c.querySelectorAll('svg')].filter(dash);
const label = (chart: Element) => [...chart.querySelectorAll('text')].find((t) => /^Median /.test(t.textContent!)) ?? null;
/** The label's box: a line of `text-2xs`, 7px a character at its widest, its ink from 9px over its baseline to 3px under it. */
function box(text: Element) {
  const x = num(text, 'x'), y = num(text, 'y'), wide = text.textContent!.length * 7;
  const left = text.getAttribute('text-anchor') === 'end' ? x - wide : x;
  return { left, right: left + wide, top: y - 9, bottom: y + 3 };
}
/** The points a path is drawn through: where it starts, and where each stretch of it ends. */
const points = (path: Element) => [...path.getAttribute('d')!.matchAll(/[MLC]([^MLCZ]*)/g)].map((m) => m[1].trim().split(/[ ,]+/).map(Number).slice(-2) as [number, number]);
/** The paths whose points under the label's span are neither all over its box nor all under it. */
function through(chart: Element, text: Element) {
  const b = box(text);
  return [...chart.querySelectorAll('path')].filter((path) => {
    const ys = points(path).filter(([x]) => x >= b.left && x <= b.right).map(([, y]) => y);
    return !(ys.every((y) => y < b.top) || ys.every((y) => y > b.bottom));
  }).map((path) => path.getAttribute('d')!.slice(0, 40));
}

beforeEach(() => { size.width = 880; });

describe('the Trend chart\'s specimens: what is usual', () => {
  it('names the baseline beside its dashed line with the sample\'s line drawn through neither, at a desk\'s width and a phone\'s', () => {
    for (const width of [880, 300]) {
      size.width = width;
      const { container, unmount } = render(<TrendChartPreview />);
      expect(charts(container).length, String(width)).toBeGreaterThan(0);
      for (const chart of charts(container)) {
        const text = label(chart);
        expect(text, String(width)).not.toBeNull();
        expect(through(chart, text!), String(width)).toEqual([]);
        // The sample's p95 runs along its median, so the specimen shows the label moved from its first place, 6px over the line's right end.
        expect([text!.getAttribute('text-anchor'), num(text!, 'y') - num(dash(chart)!, 'y1')], String(width)).not.toEqual(['end', -6]);
      }
      unmount();
    }
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Meridian } from '@/components/charts/meridian';
import { Sparkline } from '@/components/charts/sparkline';

// jsdom measures nothing, so the chart is given the width a browser would.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 120, height: 36 }] }));

const paths = (c: HTMLElement) => [...c.querySelectorAll('svg path')].map((p) => p.getAttribute('d') ?? '');
/** The separate runs a path draws: one `M` a run. */
const runs = (d: string) => d.split('M').length - 1;
/** Every y a path passes through, from its points' coordinates. */
const ys = (d: string) => [...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => Number(m[2]));

describe('a sparkline with days that have no value', () => {
  it('breaks the line and its area at a day with no value, never drawing it as zero', () => {
    const { container } = render(<Sparkline values={[4, 9, null, 6, 7]} />);
    const [area, line] = paths(container);
    expect(runs(line)).toBe(2);
    expect(runs(area)).toBe(2);
    for (const d of [area, line]) expect(d).not.toMatch(/Infinity|NaN/);
  });

  it('keeps each day at its own place on the x axis', () => {
    const { container } = render(<Sparkline values={[4, 9, null, 6, 7]} />);
    const [, line] = paths(container);
    // Five days across 120px: the run after the gap starts at the fourth day, 90px in.
    expect(line).toMatch(/M90,/);
  });

  it('takes its range from the numbers only', () => {
    const { container } = render(<Sparkline values={[4, null, 9]} />);
    const [, line] = paths(container);
    // The lowest number sits on the line's floor and the highest at its top: 3px from the top and 9px above the bottom.
    expect(Math.min(...ys(line))).toBe(3);
    expect(Math.max(...ys(line))).toBe(27);
  });

  it('draws nothing with fewer than two numbers', () => {
    for (const values of [[null, null], [5, null], [null, 5, null]]) {
      expect(render(<Sparkline values={values} />).container).toBeEmptyDOMElement();
    }
  });

  it('still marks the day the page points at when that day has no value, with the hairline and no dot', () => {
    const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
    const { container } = render(<Meridian dates={dates} day={dates[2]}><Sparkline values={[4, 9, null, 7]} /></Meridian>);
    expect(container.querySelector('svg line')).not.toBeNull();
    expect(container.querySelector('svg circle')).toBeNull();
  });
});

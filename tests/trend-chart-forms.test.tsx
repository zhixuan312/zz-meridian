import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// A chart draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 480, height: 200 }] as const };
});

import { TrendChart } from '@/components/charts/trend-chart';
import { heldTicks, ticksBetween } from '@/components/charts/scale';
import { AXIS_FORMATTERS, FORMATTERS } from '@/lib/format';

// FR-6 to FR-8 (AC-1.6 to AC-1.8): steps on every path, the points, and the held scale with its words.

const day = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
const dates = [0, 1, 2, 3, 4].map(day);
type Props = Partial<ComponentProps<typeof TrendChart>>;
const draw = (props: Props, values: (number | null)[] = [10, 40, 25, 25, 5], kind: 'line' | 'area' = 'line') =>
  render(<TrendChart label="Readings" dates={dates} series={[{ key: 'r', label: 'Reading', values, kind }]} {...props} />).container;
const stack = (props: Props = {}) =>
  render(<TrendChart label="Parts" stacked dates={dates} series={[{ key: 'a', label: 'One', values: [10, 30, 20, 40, 25] }, { key: 'b', label: 'Two', values: [5, 5, 5, 5, 5] }]} {...props} />).container;
/** Each stacked part's paths, bottom part first: its area, then its top edge. */
const parts = (c: HTMLElement) => [...c.querySelectorAll('svg[role="img"] g[mask] > g')].map((g) => [...g.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? ''));
const plotted = (c: HTMLElement) => [...c.querySelectorAll('svg[role="img"] path')].map((p) => p.getAttribute('d') ?? '').filter((d) => /[LCHV]/.test(d));
const axis = (c: HTMLElement) => [...c.querySelectorAll('svg[role="img"] text.tabular-nums')].map((t) => t.textContent);

/** The stretches a path of absolute M, L, H, V and Z commands draws, each as [x0, y0, x1, y1]. */
function stretches(d: string): [number, number, number, number][] {
  expect(d, d).not.toMatch(/[CcSsQqTtAa]/);
  const out: [number, number, number, number][] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    let nx = x, ny = y;
    if (cmd === 'M') { nx = n[0]; ny = n[1]; sx = nx; sy = ny; }
    else if (cmd === 'L') { nx = n[0]; ny = n[1]; }
    else if (cmd === 'H') nx = n[0];
    else if (cmd === 'V') ny = n[0];
    else { nx = sx; ny = sy; }
    if (cmd !== 'M') out.push([x, y, nx, ny]);
    x = nx; y = ny;
  }
  return out;
}
/** The level stretches of a path, as "y:from-to", from the smaller x to the larger. */
const flats = (d: string) =>
  stretches(d).filter(([x0, y0, x1, y1]) => y0 === y1 && x0 !== x1).map(([x0, y0, x1]) => `${y0.toFixed(3)}:${Math.min(x0, x1).toFixed(3)}-${Math.max(x0, x1).toFixed(3)}`);
const upright = (d: string) => stretches(d).every(([x0, y0, x1, y1]) => x0 === x1 || y0 === y1);

describe('curve="step"', () => {
  it('draws a line, an area and the running stretch level and upright only', () => {
    for (const kind of ['line', 'area'] as const) {
      const paths = plotted(draw({ curve: 'step', running: true }, [10, 40, 25, 25, 5], kind));
      expect(paths.length, kind).toBeGreaterThan(0);
      for (const d of paths) expect(upright(d), `${kind}: ${d}`).toBe(true);
    }
  });

  it('holds a stacked part\'s lower edge over the same days as the top of the part under it', () => {
    const [[, below], [above]] = parts(stack({ curve: 'step' }));
    const top = flats(below);
    expect(top).toHaveLength(4);
    const area = flats(above);
    for (const f of top) expect(area, f).toContain(f);
  });

  it('steps a stack\'s running stretch too', () => {
    const c = stack({ curve: 'step', running: true });
    const tail = c.querySelector('path[data-running]');
    expect(tail).not.toBeNull();
    expect(upright(tail!.getAttribute('d') ?? '')).toBe(true);
  });

  it('leaves a stack exactly as today without a curve', () => {
    const today = parts(stack());
    expect(today.flat().some((d) => d.includes('C'))).toBe(true);
    expect(parts(stack({ curve: 'monotone' }))).toEqual(today);
  });
});

describe('points', () => {
  it('draws a dot on each measured value of a line or an area, and none on a missing day', () => {
    for (const kind of ['line', 'area'] as const) expect(draw({ points: true }, [10, 40, null, 25, 5], kind).querySelectorAll('[data-point]'), kind).toHaveLength(4);
  });

  it('draws none without points, on a dashed reference or on a stack', () => {
    expect(draw({}).querySelectorAll('[data-point]')).toHaveLength(0);
    const ref = render(
      <TrendChart label="Readings" points dates={dates} series={[{ key: 'r', label: 'Reading', values: [10, 40, 25, 25, 5], kind: 'line' }, { key: 'p', label: 'Prior', values: [12, 30, 20, 30, 8], kind: 'dashed' }]} />,
    ).container;
    expect(ref.querySelectorAll('[data-point]')).toHaveLength(5);
    expect(stack({ points: true }).querySelectorAll('[data-point]')).toHaveLength(0);
  });

  it('draws them while they stand at least 6px apart, and none once closer', () => {
    const many = (n: number) => {
      const ds = Array.from({ length: n }, (_, i) => day(i));
      return render(<TrendChart label="Readings" points dates={ds} series={[{ key: 'r', label: 'Reading', values: ds.map((_, i) => 10 + (i % 7)), kind: 'line' }]} />).container;
    };
    expect(many(60).querySelectorAll('[data-point]')).toHaveLength(60);
    expect(many(120).querySelectorAll('[data-point]')).toHaveLength(0);
  });
});

describe('domain, a held scale', () => {
  const tick = AXIS_FORMATTERS.count, f = FORMATTERS.count;

  it('ends the plot at the domain, on the held levels, when every value is inside it', () => {
    const c = draw({ domain: [0, 100] });
    expect(axis(c)).toEqual(heldTicks(0, 100).map(tick));
    expect(c.textContent).not.toMatch(/Scale widened/);
  });

  it('holds a line\'s lower end, and takes an area and a stack down to zero', () => {
    expect(axis(draw({ domain: [20, 80] }, [30, 40, 50, 60, 70]))).toEqual(heldTicks(20, 80).map(tick));
    expect(axis(draw({ domain: [20, 80] }, [30, 40, 50, 60, 70], 'area'))).toEqual(heldTicks(0, 80).map(tick));
  });

  it('widens to the nice levels that take every value, and says so above the plot and in the table', () => {
    const c = draw({ domain: [0, 100] }, [10, 150, 25, 25, 5]);
    const t = ticksBetween(0, 150, 4);
    expect(axis(c)).toEqual(t.map(tick));
    const words = `Scale widened from ${f(0)}–${f(100)} to ${f(t[0])}–${f(t[t.length - 1])}`;
    const line = c.querySelector('[data-widened]');
    expect(line?.textContent).toBe(words);
    expect(line?.closest('svg, table')).toBeNull();
    expect(c.querySelector('table caption')?.textContent).toContain(words);
  });

  it('refuses a domain beside a floor, in its type', () => {
    // @ts-expect-error a held scale and a floor are not passed together
    const both = <TrendChart label="Readings" dates={dates} series={[]} domain={[0, 100]} floor={0} />;
    expect(both).toBeTruthy();
  });
});

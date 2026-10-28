import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// A Sparkline draws once it knows its width; the size hook is replaced with a stated one.
vi.mock('@/components/charts/use-size', () => ({ useSize: () => [{ current: null }, { width: 120, height: 36 }] }));

import { Sparkline } from '@/components/charts/sparkline';

// FR-9 (AC-1.9): the Sparkline's curve and held scale, and the words of a widened one.

type Props = Partial<ComponentProps<typeof Sparkline>>;
const draw = (values: (number | null)[], props: Props = {}) => render(<Sparkline values={values} {...props} />).container;
/** The area's path, then the line's. */
const paths = (c: HTMLElement) => [...c.querySelectorAll('svg path')].map((p) => p.getAttribute('d') ?? '');
/** The y of each corner of a straight line's path. */
const ys = (c: HTMLElement) => [...paths(c)[1].matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map((m) => Number(m[2]));

describe('a Sparkline\'s curve', () => {
  it('draws today\'s smooth curve without one', () => {
    const today = paths(draw([4, 9, 6, 7]));
    expect(today.some((d) => d.includes('C'))).toBe(true);
    expect(paths(draw([4, 9, 6, 7], { curve: 'monotone' }))).toEqual(today);
  });

  it('draws straight segments with curve="linear" and steps with curve="step"', () => {
    const straight = paths(draw([4, 9, 6, 7], { curve: 'linear' }));
    expect(straight.filter((d) => d.includes('C'))).toEqual([]);
    expect(straight[1]).toMatch(/L/);
    const step = paths(draw([4, 9, 6, 7], { curve: 'step' }));
    expect(step.filter((d) => d.includes('C'))).toEqual([]);
    expect(step[1]).toMatch(/^(?:M[-\d.]+,[-\d.]+(?:[HV][-\d.]+)+)+$/);
  });
});

describe('a Sparkline\'s domain', () => {
  it('draws on the held range: a value sits where the domain puts it, not where the data\'s own range would', () => {
    const ends = ys(draw([0, 50, 100], { curve: 'linear', domain: [0, 100] }));
    const held = ys(draw([25, 50, 75], { curve: 'linear', domain: [0, 100] }));
    expect(held[0]).toBeCloseTo(ends[0] + 0.25 * (ends[2] - ends[0]), 6);
    expect(held[2]).toBeCloseTo(ends[0] + 0.75 * (ends[2] - ends[0]), 6);
    const own = ys(draw([25, 50, 75], { curve: 'linear' }));
    expect(own[0]).toBeCloseTo(ends[0], 6);
    expect(own[2]).toBeCloseTo(ends[2], 6);
  });

  it('keeps its title when every value is inside the domain', () => {
    expect(draw([25, 50, 75], { domain: [0, 100] }).firstElementChild?.getAttribute('title')).toBe('25 to 75');
  });

  it('widens to take a value outside it, and says so in its title', () => {
    const wide = draw([0, 75, 150], { curve: 'linear', domain: [0, 100] });
    expect(wide.firstElementChild?.getAttribute('title')).toBe('0 to 150, scale widened from 0–100');
    expect(ys(wide)).toEqual(ys(draw([0, 75, 150], { curve: 'linear' })));
  });
});

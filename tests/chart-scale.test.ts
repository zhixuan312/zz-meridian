import { describe, expect, it } from 'vitest';
import { niceTicks, ticksBetween } from '@/components/charts/scale';

// The scale a chart is drawn on: which levels its gridlines stand at, and which level the plot's floor is. Every point
// is placed by these numbers, so a level a step out is a whole plot's worth of nothing at one end.

describe('ticksBetween: the levels a chart is drawn on', () => {
  it('counts from zero as niceTicks does when it is given no floor', () => {
    for (const [max, count] of [[1, 4], [100, 4], [3_300_438.74, 4], [640, 3]] as const) {
      expect(ticksBetween(0, max, count)).toEqual(niceTicks(max, count));
    }
  });

  it('lands the floor on a step, so the level the plot is drawn to is one the axis names', () => {
    // 0.7 / 0.1 is 6.999… in binary: a floor of 70% on a 10% step came out as 60%, and a fifth of the plot was empty.
    expect(ticksBetween(0.7, 1, 4)).toEqual([0.7, 0.8, 0.9, 1]);
    expect(ticksBetween(0.9, 1, 4)[0]).toBe(0.9);
    expect(ticksBetween(80, 100, 4)[0]).toBe(80);
    expect(ticksBetween(0.75, 1, 3)[0]).toBe(0.7);
  });

  it('holds every level between the floor and a whole step at or over the top of the data', () => {
    for (const [floor, max, count] of [[0.7, 1, 4], [0.86, 0.9994, 3], [0.5, 0.62, 4], [250, 520, 3]] as const) {
      const ticks = ticksBetween(floor, max, count);
      expect(ticks.length, `${floor}..${max}`).toBeGreaterThanOrEqual(3);
      expect(ticks.length).toBeLessThanOrEqual(5);
      expect(ticks[0]).toBeLessThanOrEqual(floor);
      expect(ticks.at(-1)).toBeGreaterThanOrEqual(max);
      // The floor is the nearest step at or under it, never a step lower.
      const step = ticks[1] - ticks[0];
      expect(ticks[0]).toBeGreaterThan(floor - step);
      for (let i = 1; i < ticks.length; i++) expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 9);
    }
  });

  it('falls back to the zero-based levels when the floor is not under the top', () => {
    expect(ticksBetween(1, 1, 4)).toEqual(niceTicks(1, 4));
    expect(ticksBetween(2, 1, 4)).toEqual(niceTicks(1, 4));
    expect(ticksBetween(0.7, 0, 4)).toEqual([0, 1]);
  });
});

describe('ticksBetween for a signed series and a fine one (#78)', () => {
  it('counts a floor under zero down to a step under it, with zero among the levels', () => {
    expect(ticksBetween(-35, 80, 4)).toEqual([-50, 0, 50, 100]);
    expect(ticksBetween(-12, 0, 3)).toEqual([-15, -10, -5, 0]);
    expect(ticksBetween(-0.3, 0.2, 4)).toContain(0);
    expect(Object.is(ticksBetween(-0.3, 0.2, 4).find((t) => t === 0), 0)).toBe(true);
  });
  it('tells levels a millionth apart from one another', () => {
    const ticks = ticksBetween(1.00106, 1.00108, 4);
    expect(ticks).toEqual([1.00106, 1.001065, 1.00107, 1.001075, 1.00108]);
    expect(new Set(ticksBetween(0.99970, 1.0001, 4)).size).toBe(ticksBetween(0.99970, 1.0001, 4).length);
  });
});

describe('niceTicks for counts (#72)', () => {
  it('steps by whole numbers only, so a top of 1 is ticked 0 and 1 and nothing between', () => {
    expect(niceTicks(1, 3)).toEqual([0, 0.5, 1]);
    expect(niceTicks(1, 3, true)).toEqual([0, 1]);
    expect(niceTicks(2, 3, true)).toEqual([0, 1, 2]);
    expect(niceTicks(7, 3, true)).toEqual([0, 5, 10]);
    expect(niceTicks(9, 4, true)).toEqual([0, 5, 10]);
    expect(niceTicks(0, 3, true)).toEqual([0, 1]);
  });
  it('leaves a scale of counts that steps by whole numbers already as it was', () => {
    for (const max of [12, 40, 75, 640, 3_300_438]) expect(niceTicks(max, 3, true)).toEqual(niceTicks(max, 3));
  });
});

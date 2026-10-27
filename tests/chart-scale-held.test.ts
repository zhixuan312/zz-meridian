import { describe, expect, it } from 'vitest';
import { heldTicks, linearPath, monotonePath, stepPath, ticksBetween } from '@/components/charts/scale';

// A held scale ends where the caller says, so charts drawn on one domain compare row by row; a straight or a step line
// passes through every value and draws none the data does not hold (spec FR-16, AC-1.1).

describe('heldTicks: levels that end at both bounds', () => {
  it('ends at the domain it is given', () => {
    expect(heldTicks(-60, 60)).toEqual([-60, -40, -20, 0, 20, 40, 60]);
    expect(heldTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(heldTicks(0, 350)).toEqual([0, 50, 100, 150, 200, 250, 300, 350]);
    expect(heldTicks(0.7, 1)).toEqual([0.7, 0.8, 0.9, 1]);
  });

  it('keeps the step nearest the count, and the smaller of two equally near', () => {
    expect(heldTicks(0, 60)).toEqual([0, 20, 40, 60]);
    expect(heldTicks(0, 60, 6)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    // Two intervals and four are both one from three: the smaller step is kept.
    expect(heldTicks(0, 100, 3)).toEqual([0, 25, 50, 75, 100]);
  });

  it('falls back to the bounds, and zero between them, when no nice step divides the span', () => {
    expect(heldTicks(-7, 13)).toEqual([-7, 0, 13]);
    expect(heldTicks(3, 17)).toEqual([3, 17]);
  });

  it('is not held over a span that is not a range, so a chart never divides by zero', () => {
    for (const [min, max] of [[5, 5], [10, 0], [Number.NaN, 1]] as const) {
      expect(heldTicks(min, max), `${min}..${max}`).toEqual(ticksBetween(min, max, 4));
    }
  });
});

const pts: [number, number][] = [[0, 10], [10, 40], [20, 25], [30, 25], [40, 5]];

/** The corners a path of absolute M, L, H and V commands turns at, in order. */
function corners(d: string): [number, number][] {
  expect(d, d).toMatch(/^M[MLHV\d.,\s-]*$/);
  const out: [number, number][] = [];
  let x = 0, y = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHV])([^MLHV]*)/g)) {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'H') x = n[0];
    else if (cmd === 'V') y = n[0];
    else { x = n[0]; y = n[1]; }
    out.push([x, y]);
  }
  return out;
}

describe('linearPath: straight segments through every point', () => {
  it('turns at exactly the points, and nowhere else', () => {
    expect(linearPath(pts)).not.toContain('C');
    expect(corners(linearPath(pts))).toEqual(pts);
  });

  it('draws only the stretch from `from` to `to`', () => {
    expect(corners(linearPath(pts, 1, 3))).toEqual(pts.slice(1, 4));
    expect(corners(linearPath(pts, pts.length - 2))).toEqual(pts.slice(-2));
  });

  it('agrees with monotonePath on fewer than two points', () => {
    expect(linearPath([])).toBe(monotonePath([]));
    expect(linearPath([[1, 2]])).toBe(monotonePath([[1, 2]]));
  });
});

describe('stepPath: each value held until the next point', () => {
  const c = corners(stepPath(pts));

  it('passes through every point', () => {
    for (const p of pts) expect(c, String(p)).toContainEqual(p);
  });

  it('holds each value to the next date: a stretch is level, then rises or falls at that date', () => {
    for (let i = 0; i < pts.length - 1; i++) expect(c, `after ${i}`).toContainEqual([pts[i + 1][0], pts[i][1]]);
    for (let i = 1; i < c.length; i++) {
      const flat = c[i][1] === c[i - 1][1], upright = c[i][0] === c[i - 1][0];
      expect(flat || upright, `stretch ${i}`).toBe(true);
    }
  });

  it('stays inside the values and the dates it is drawn through', () => {
    for (const [x, y] of c) {
      expect(y).toBeGreaterThanOrEqual(5);
      expect(y).toBeLessThanOrEqual(40);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(40);
    }
  });

  it('draws only the stretch from `from` to `to`, and agrees with monotonePath on fewer than two points', () => {
    const part = corners(stepPath(pts, 1, 3));
    expect(part[0]).toEqual(pts[1]);
    expect(part.at(-1)).toEqual(pts[3]);
    expect(stepPath([])).toBe(monotonePath([]));
    expect(stepPath([[1, 2]])).toBe(monotonePath([[1, 2]]));
  });
});

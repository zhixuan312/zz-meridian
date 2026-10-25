// @vitest-environment node
// CLS is the largest session window, and a window has two bounds: each shift within 1 s of the last, and the whole
// window within 5 s of its first. With the gap alone a page that fills in over half a minute reports one session the
// length of the page — a number no other tool produces and a page inside its budget can fail on (issue #90).
import { describe, expect, test } from 'vitest';
import { CLS_SESSION } from '../scripts/lib/cls.ts';

type State = { session: number; last: number; started: number; cls: number };
const shift = new Function('v', 'e', CLS_SESSION) as (v: State, e: { startTime: number; value: number }) => void;

/** Shifts of `value` every `every` ms from `from` to `until`, through the body the page itself runs. */
function run(until: number, { from = 0, every = 200, value = 0.01 } = {}): State {
  const v: State = { session: 0, last: 0, started: 0, cls: 0 };
  for (let t = from; t <= until; t += every) shift(v, { startTime: t, value });
  return v;
}

describe('the CLS session window', () => {
  test('closes at 5 s, so a long run of small shifts is two windows and not one', () => {
    const v = run(6000);
    // t = 0 … 4800 is the first window: 25 shifts. The shift at 5000 is 5 s past the window's first, so it opens the
    // second, which then takes 5200 … 6000. The score is the largest window, never the page's total of 0.31.
    expect(v.cls).toBeCloseTo(0.25, 5);
    expect(v.session).toBeCloseTo(0.06, 5);
    expect(v.started).toBe(5000);
  });

  test('closes on a gap over 1 s inside the 5 s, and opens again on the next shift', () => {
    const v: State = { session: 0, last: 0, started: 0, cls: 0 };
    for (const startTime of [0, 200, 3000]) shift(v, { startTime, value: 0.01 });
    expect(v.cls).toBeCloseTo(0.02, 5);
    expect(v.started).toBe(3000);
  });

  test('opens on the first shift, not on the page', () => {
    // A window starts where its first shift landed: 300 ms in, the same shift 5 s later is a new window.
    expect(run(300, { from: 300 }).started).toBe(300);
    expect(run(5400, { from: 300 }).started).toBe(5300);
  });
});

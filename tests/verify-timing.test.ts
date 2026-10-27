// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HEADROOM, headroom, judge, p95, summary, thin } from '../scripts/lib/timing.ts';

describe('the timing rule', () => {
  it('passes one sample within its limit and asks for a retake over it', () => {
    expect(judge([420], 500).verdict).toBe('pass');
    expect(judge([620], 500).verdict).toBe('retake');
  });
  it('gates three samples on their median, never on the best one', () => {
    expect(judge([1000, 900, 200], 500)).toMatchObject({ verdict: 'fail', median: 900 });
    expect(judge([900, 200, 250], 500)).toMatchObject({ verdict: 'pass', median: 250, noisy: true });
    expect(judge([300, 200, 250], 500)).toMatchObject({ verdict: 'pass', noisy: false });
  });
  it('refuses any other number of samples', () => {
    expect(() => judge([], 500)).toThrow();
    expect(() => judge([1, 2], 500)).toThrow();
  });
});

describe('p95', () => {
  it('is nearest-rank, and the summary reports median, p95 and maximum', () => {
    const s = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
    expect(p95(s)).toBe(190);
    expect(summary(s)).toEqual({ median: 105, p95: 190, max: 200 });
    expect(p95([5])).toBe(5);
  });
});

// A time that passes by a hair here is a red on a slower machine: the weekly runner measured this laptop's passes at
// about 1.6 times their time at the same phone rate. So a pass that leaves less than a fifth of its limit says so.
describe('headroom', () => {
  it('is the share of the limit a figure left unspent, and none at or over it', () => {
    expect(headroom(400, 500)).toBeCloseTo(0.2);
    expect(headroom(0, 500)).toBe(1);
    expect(headroom(500, 500)).toBe(0);
    expect(headroom(900, 500)).toBe(0);
  });
  it('is thin under a fifth of the limit, for a pass only', () => {
    expect(HEADROOM).toBe(0.2);
    expect(thin(401, 500)).toBe(true);
    expect(thin(500, 500)).toBe(true);
    expect(thin(400, 500)).toBe(false);
    expect(thin(501, 500)).toBe(false);
    expect(thin(0.085, 0.1)).toBe(true);
    expect(thin(2100, 2500)).toBe(true);
  });
  it('refuses a limit that is no limit', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => headroom(1, bad)).toThrow(/limit/);
  });
});

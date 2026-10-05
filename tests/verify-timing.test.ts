// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { judge, p95, summary } from '../scripts/lib/timing.ts';

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

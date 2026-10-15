import { describe, expect, it } from 'vitest';
import { formatCompact } from '@/lib/format';

/**
 * A compact count steps up only where its one decimal would read a thousand of the step below, and writes the digits it
 * decided on: 950,000,000 is 950.0M, as 949,999,999 is and as the axis tick at 950M reads, never 0.9B, which reads
 * smaller than its neighbour.
 */
describe('a compact count at the edge of a step', () => {
  it('stays on the step below until one decimal of it reads a thousand', () => {
    expect(formatCompact(949_999_999)).toBe('950.0M');
    expect(formatCompact(950_000_000)).toBe('950.0M');
    expect(formatCompact(950_000_000_000)).toBe('950.0B');
    expect(formatCompact(999_949_999)).toBe('999.9M');
    expect(formatCompact(999_950_000)).toBe('1.0B');
  });

  it('never reads a larger count smaller than a smaller one', () => {
    const at = (n: number) => {
      const m = /^(-?[\d.]+)([KMBT]?)$/.exec(formatCompact(n).replace(/,/g, ''))!;
      return Number(m[1]) * { '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2] as '' | 'K' | 'M' | 'B' | 'T'];
    };
    const ns = [0.94, 0.949, 0.95, 0.951, 0.96, 0.999, 1, 1.05].flatMap((f) => [f * 1e6, f * 1e9, f * 1e12]).sort((a, b) => a - b);
    for (let i = 1; i < ns.length; i++) expect(at(ns[i]), `${ns[i - 1]} then ${ns[i]}`).toBeGreaterThanOrEqual(at(ns[i - 1]));
  });

  it('rounds a negative as the positive it mirrors', () => {
    expect(formatCompact(-1_500)).toBe(`-${formatCompact(1_500)}`);
    expect(formatCompact(-950_000_000)).toBe('-950.0M');
  });
});

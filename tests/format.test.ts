import { describe, expect, it } from 'vitest';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';

describe('formatters', () => {
  it('render a missing value as a dash, never as zero', () => {
    for (const f of [formatCompact, formatCost, formatDuration, formatPercent]) expect(f(null)).toBe('—');
  });
  it('keep compact counts readable at every magnitude', () => {
    expect(formatCompact(912)).toBe('912');
    expect(formatCompact(846_300)).toBe('846K');
    expect(formatCompact(999_999)).toBe('1.0M');
    expect(formatCompact(2_941_000)).toBe('2.9M');
  });
  it('format money, durations and shares', () => {
    expect(formatCost(298.43)).toBe('$298.43');
    expect(formatDuration(294)).toBe('294ms');
    expect(formatDuration(1420)).toBe('1.4s');
    expect(formatPercent(0.0090, 2)).toBe('0.90%');
  });
});

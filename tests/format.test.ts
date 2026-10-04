import { app } from '@/app.config';
import { describe, expect, it } from 'vitest';
import { niceTicks } from '@/components/charts/scale';
import { AXIS_FORMATTERS, formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';

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
    // The symbol follows app.currency, so a rebranded product (--currency SGD) keeps this test green.
    const symbol = new Intl.NumberFormat('en', { style: 'currency', currency: app.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')!.value;
    expect(formatCost(298.43)).toBe(`${symbol}298.43`);
    expect(formatDuration(294)).toBe('294ms');
    expect(formatDuration(1420)).toBe('1.4s');
    expect(formatPercent(0.0090, 2)).toBe('0.90%');
  });
});

describe('the count axis', () => {
  // Swept rather than chosen: round maxima happen to land on steps that format distinctly, so a hand-picked set passes
  // against the very rounding this is written to catch.
  it('never gives two ticks on one scale the same label', () => {
    const bad: string[] = [];
    for (let raw = 1; raw <= 6000; raw += 1) {
      for (const n of [3, 4]) {
        const labels = niceTicks(raw, n).map((t) => AXIS_FORMATTERS.count(t));
        if (new Set(labels).size !== labels.length) bad.push(`${raw}/${n} -> ${labels.join(' · ')}`);
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it('keeps a decimal only where the number needs one', () => {
    expect(AXIS_FORMATTERS.count(1500)).toBe('1.5K');
    expect(AXIS_FORMATTERS.count(2000)).toBe('2K');
    expect(AXIS_FORMATTERS.count(2_500_000)).toBe('2.5M');
    expect(AXIS_FORMATTERS.count(0)).toBe('0');
    expect(AXIS_FORMATTERS.count(500)).toBe('500');
  });
});

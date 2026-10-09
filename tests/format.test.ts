import { app } from '@/app.config';
import { formatDay } from '@/lib/format-date';
import { describe, expect, it } from 'vitest';
import { niceTicks } from '@/components/charts/scale';
import { AXIS_FORMATTERS, fitFigure, formatCompact, formatCost, formatDuration, formatPercent, splitFigure } from '@/lib/format';

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
  it('read a negative compact count like the positive it mirrors', () => {
    // A net or a delta: the tile used to fall through to "-1,500,000" while the axis rendered "-1.5M".
    expect(formatCompact(-1_500_000)).toBe('-1.5M');
    expect(formatCompact(-846_300)).toBe('-846K');
    expect(formatCompact(-912)).toBe('-912');
  });
  it('split a figure once, for the two cards that step a unit down', () => {
    // Money steps its cents down; anything else keeps the number whole and steps the unit.
    expect(splitFigure('$298.43')).toEqual({ pre: '$', int: '298', frac: '.43', unit: undefined });
    expect(splitFigure('2.9M')).toEqual({ pre: undefined, int: '2.9', frac: undefined, unit: 'M' });
    expect(splitFigure('$1.2M')).toEqual({ pre: '$', int: '1.2', frac: undefined, unit: 'M' });
    expect(splitFigure('0.90%')).toEqual({ pre: undefined, int: '0.90', frac: undefined, unit: '%' });
    // Total: a string it cannot split comes back whole, so no formatter a product passes can crash the figure.
    expect(splitFigure('—')).toEqual({ int: '—' });
    expect(splitFigure('-1,234')).toEqual({ int: '-1,234' });
    expect(splitFigure('CHF1,234.50')).toEqual({ pre: 'CHF', int: '1,234', frac: '.50', unit: undefined });
    // A formatter that writes something else — a word, a space in the symbol — is never split, and never crashes.
    expect(splitFigure('CHF 1,234.50')).toEqual({ int: 'CHF 1,234.50' });
  });
  it('format money, durations and shares', () => {
    // The symbol follows app.currency, so a rebranded product (--currency SGD) keeps this test green.
    const symbol = new Intl.NumberFormat('en', { style: 'currency', currency: app.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')!.value;
    expect(formatCost(298.43)).toBe(`${symbol}298.43`);
    // One precision in a column: $997.00 above $1,269.40, never above $1,269, so the decimals line up.
    expect(formatCost(1269.4)).toBe(`${symbol}1,269.40`);
    expect(formatCost(997)).toBe(`${symbol}997.00`);
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

describe('fitFigure', () => {
  it('keeps a figure whole while its number fits a tile, and reads it at a glance past that', () => {
    expect(fitFigure('$298.43', 298.43)).toBe('$298.43');
    expect(fitFigure('2,943,120', 2_943_120)).toBe('2,943,120');
    expect(fitFigure('9,876,543,210', 9_876_543_210)).toBe('9.9B');
    expect(fitFigure('$1,234,567.89', 1_234_567.89)).toBe('$1.2M');
    expect(fitFigure('0.90%', 0.009)).toBe('0.90%');
    expect(fitFigure('12,480,000 tokens', 12_480_000)).toBe('12.5M tokens');
    expect(fitFigure('Likely new', NaN)).toBe('Likely new');
  });
});

describe('formatDay', () => {
  it('writes a day inside a sentence without the table padding', () => {
    expect(formatDay('2026-10-01T12:00:00Z')).toBe('1 Oct');
    expect(formatDay('2026-09-22T12:00:00Z')).toBe('22 Sept');
  });
});

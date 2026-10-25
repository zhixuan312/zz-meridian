import { app } from '@/app.config';
import { formatDay } from '@/lib/format-date';
import { describe, expect, it } from 'vitest';
import { niceTicks } from '@/components/charts/scale';
import { AXIS_FORMATTERS, fitFigure, formatCompact, formatCost, formatDuration, formatPercent, splitFigure } from '@/lib/format';

// The symbol follows app.currency, so a rebranded product (--currency SGD) keeps these tests green.
const symbol = new Intl.NumberFormat('en', { style: 'currency', currency: app.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')!.value;

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
  it('step a count up to trillions, and up a step where one decimal rounds it to a thousand of the one below', () => {
    expect(formatCompact(1_101_098_030)).toBe('1.1B');
    expect(formatCompact(2_234_100_000_000)).toBe('2.2T');
    expect(formatCompact(999_960_000_000)).toBe('1.0T');
    expect(formatCompact(999_960_000)).toBe('1.0B');
    expect(formatCompact(-2_234_100_000_000)).toBe('-2.2T');
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
    // A credit's minus belongs to the mark, with any symbol beside it (issue #96): `-$298.43` as one string was no split
    // at all, so a tile set a sign-and-symbol figure whole in its number face, or lost both when it shortened.
    expect(splitFigure('-1,234')).toEqual({ pre: '-', int: '1,234', frac: undefined, unit: undefined });
    expect(splitFigure('-$298.43')).toEqual({ pre: '-$', int: '298', frac: '.43', unit: undefined });
    expect(splitFigure('CHF1,234.50')).toEqual({ pre: 'CHF', int: '1,234', frac: '.50', unit: undefined });
    // A multi-letter mark before the symbol splits the same way.
    expect(splitFigure('HK$12,345,678')).toEqual({ pre: 'HK$', int: '12,345,678', frac: undefined, unit: undefined });
    // A formatter that writes something else — a word, a space in the symbol — is never split, and never crashes.
    expect(splitFigure('CHF 1,234.50')).toEqual({ int: 'CHF 1,234.50' });
  });
  it('format money, durations and shares', () => {
    expect(formatCost(298.43)).toBe(`${symbol}298.43`);
    // Under a cent, four decimals; and an amount too small for four keeps its first two digits, never a row of zeros.
    expect(formatCost(0.00522)).toBe(`${symbol}0.0052`);
    expect(formatCost(0.0000018)).toBe(`${symbol}0.0000018`);
    expect(formatCost(0)).toBe(`${symbol}0`);
    // One precision in a column: $997.00 above $1,269.40, never above $1,269, so the decimals line up.
    expect(formatCost(1269.4)).toBe(`${symbol}1,269.40`);
    expect(formatCost(997)).toBe(`${symbol}997.00`);
    // A credit or a refund is negative, and the minus stands where a reader looks for it: before the mark, at every
    // size. `$-0.0050` reads as a typo, and hides the sign a column is sorted by.
    expect(formatCost(-1269.4)).toBe(`-${symbol}1,269.40`);
    expect(formatCost(-0.005)).toBe(`-${symbol}0.0050`);
    expect(formatCost(-0.0000018)).toBe(`-${symbol}0.0000018`);
    // An amount too small even for 20 places keeps two digits in exponent form: `toFixed` there prints only zeroes, and
    // a figure that is not nothing must not read as nothing (issue #96).
    expect(formatCost(1e-21)).toBe(`${symbol}1.0e-21`);
    expect(formatCost(-2.5e-30)).toBe(`-${symbol}2.5e-30`);
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
    // Past a billion a tick reads in billions, as the figure at rest does: 1.5B, never 1500M.
    expect(AXIS_FORMATTERS.count(1_500_000_000)).toBe('1.5B');
    expect(AXIS_FORMATTERS.count(1_000_000_000)).toBe('1B');
    expect(AXIS_FORMATTERS.count(2_000_000_000_000)).toBe('2T');
    expect(AXIS_FORMATTERS.compact(-1_500_000_000)).toBe('-1.5B');
    expect(AXIS_FORMATTERS.count(0)).toBe('0');
    expect(AXIS_FORMATTERS.count(500)).toBe('500');
  });
});

describe('fitFigure', () => {
  it('keeps a figure whole while its number fits a tile, and reads it at a glance past that', () => {
    expect(fitFigure('$298.43', 298.43)).toBe('$298.43');
    expect(fitFigure('2,943,120', 2_943_120)).toBe('2,943,120');
    expect(fitFigure('9,876,543,210', 9_876_543_210)).toBe('9.9B');
    expect(fitFigure(`${symbol}1,234,567.89`, 1_234_567.89)).toBe(`${symbol}1.2M`);
    expect(fitFigure('0.90%', 0.009)).toBe('0.90%');
    expect(fitFigure('12,480,000 tokens', 12_480_000)).toBe('12.5M tokens');
    expect(fitFigure('Likely new', NaN)).toBe('Likely new');
  });

  // The figure shortens with the mark and the sign it was given, not with a generic cost formatter's (issue #96): a
  // tile read "$12.3M" for an amount in Hong Kong dollars, and dropped a credit's minus altogether.
  it('shortens with the mark and the sign the caller\'s own text carries', () => {
    expect(fitFigure('HK$12,345,678', 12_345_678)).toBe('HK$12.3M');
    expect(fitFigure('-$1,234,567.89', -1_234_567.89)).toBe('-$1.2M');
    expect(fitFigure("-1,234,567.89", -1_234_567.89)).toBe('-1.2M');
    expect(fitFigure('CHF12,943,120', 12_943_120)).toBe('CHF12.9M');
  });
});

describe('formatDay', () => {
  it('writes a day inside a sentence without the table padding', () => {
    expect(formatDay('2026-10-01T12:00:00Z')).toBe('1 Oct');
    expect(formatDay('2026-09-22T12:00:00Z')).toBe('22 Sept');
  });
});

describe('a money axis', () => {
  it('reads large ticks at a glance and small ones exactly', () => {
    expect(AXIS_FORMATTERS.cost(12)).toBe(`${symbol}12`);
    expect(AXIS_FORMATTERS.cost(5_000)).toBe(`${symbol}5K`);
    expect(AXIS_FORMATTERS.cost(25_000)).toBe(`${symbol}25K`);
    expect(AXIS_FORMATTERS.cost(5_000_000_000)).toBe(`${symbol}5B`);
  });
});

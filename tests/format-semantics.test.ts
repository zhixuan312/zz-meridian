import { describe, expect, it } from 'vitest';
import { DELTA_FORMATS } from '@/components/ui/delta';
import { AXIS_FORMATTERS, FORMATTERS, fitFigure, formatCompact, formatCost, formatDuration, formatPercent, splitFigure, type NumberFormat } from '@/lib/format';

/**
 * Every formatter a figure, a tile, a chart's readout or its axis prints through, given the values a product's data
 * holds and the sample's never does. None may print a number that is not one, a zero with a sign (a reader takes `-0` or
 * `-$0` for a fall), a sign the value does not have, or the word for a missing value where there is a number; a missing
 * value reads as missing, never as zero. The sample's figures are positive and of a middling size by construction, so a
 * tiny amount printed as $0 (#96) and a signed series dropped (#78, #80) reached an adopter first.
 */
const VALUES = [0, -0, 1, -1, 0.5, -0.5, 1e-9, -1e-9, 4.9e-5, 0.000123, 999.95, 999_999.5, 1e15, -1e15, 123_456_789.123, Number.MAX_SAFE_INTEGER];
const MISSING_WORD = /^(—|–|No data|Not recorded)$/;

type F = (n: number | null) => string;
const ALL: Record<string, F> = {
  ...Object.fromEntries(Object.entries(FORMATTERS).map(([k, f]) => [`FORMATTERS.${k}`, f])),
  ...Object.fromEntries(Object.entries(AXIS_FORMATTERS).map(([k, f]) => [`AXIS_FORMATTERS.${k}`, f])),
  formatCost, formatCompact, formatDuration, formatPercent: (n) => formatPercent(n),
};

describe('every formatter, given every value a product holds', () => {
  for (const [name, f] of Object.entries(ALL)) {
    it(`${name}: a number reads as a number with its own sign, and a missing value as missing`, () => {
      for (const v of VALUES) {
        const out = f(v);
        expect(out, `${name}(${v})`).not.toMatch(/NaN|Infinity|undefined|null/);
        expect(out.trim(), `${name}(${v}) is empty`).not.toBe('');
        // A zero has no sign: -0, -$0, -0.0% read as a fall, whether the value was -0 or a fall too small to print.
        if (!/[1-9]/.test(out)) expect(out, `${name}(${Object.is(v, -0) ? '-0' : v}) prints a signed zero`).not.toMatch(/^[-−]/);
        // A value below zero says so, unless it rounds to zero, which then has no sign.
        if (v < 0 && /[1-9]/.test(out)) expect(out, `${name}(${v})`).toMatch(/^[-−]|^\(/);
        if (v > 0) expect(out, `${name}(${v})`).not.toMatch(/^[-−]/);
        expect(out, `${name}(${v}) reads as missing`).not.toMatch(MISSING_WORD);
      }
      expect(f(null), `${name}(null)`).not.toMatch(/\d/);
    });
  }
  for (const [name, f] of Object.entries(DELTA_FORMATS)) {
    it(`Delta ${name}: a change prints its size, the arrow carries its direction`, () => {
      for (const v of VALUES) expect(f(v), `${name}(${v})`).not.toMatch(/NaN|Infinity|^[-−]/);
    });
  }
  it('a figure split for its number face keeps its sign and its symbols whatever they are', () => {
    for (const text of ['-$1,234.50', '$-0', 'HK$12,345,678', '-€1.2M', '+34%', '1.2M tokens', '0', '-0.000123']) {
      const p = splitFigure(text);
      expect(`${p.pre ?? ''}${p.int}${p.frac ?? ''}${p.unit ? ` ${p.unit}` : ''}`.replace(/\s+/g, ''), text).toBe(text.replace(/\s+/g, ''));
    }
  });
  it('a figure shortened to fit keeps its sign and its symbol', () => {
    for (const [text, v] of [['-$123,456,789.12', -123_456_789.12], ['HK$12,345,678,901', 12_345_678_901], ['-€1,234,567,890', -1_234_567_890]] as const) {
      const out = fitFigure(text, v);
      expect(out.length, `${text} -> ${out}`).toBeLessThanOrEqual(12);
      if (v < 0) expect(out, `${text} -> ${out}`).toMatch(/^[-−]/);
      expect(out, `${text} -> ${out}`).toMatch(text.includes('HK$') ? /HK\$/ : text.includes('€') ? /€/ : /\$/);
    }
  });
});

const NAMES = Object.keys(FORMATTERS) as NumberFormat[];
it('every named format has an axis form', () => { for (const n of NAMES) expect(typeof AXIS_FORMATTERS[n]).toBe('function'); });

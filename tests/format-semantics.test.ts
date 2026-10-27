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
    for (const text of ['-$1,234.50', '$-0', 'HK$12,345,678', '-€1.2M', '+34%', '1.2M tokens', '0', '-0.000123', '<0.1%', '-<0.01%']) {
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

/**
 * A figure is written in the unit its ROUNDED value belongs to. A p95 of 999.6 ms is an ordinary value, and choosing the
 * unit from the raw value and the digits from the rounded one printed it "1000ms"; a minute's run read "60.0s".
 * formatCompact already decides its step from the rounded figure (999,999 reads 1.0M); every formatter holds that.
 */
describe('a figure that rounds up to the next unit is written in that unit', () => {
  const NEXT_UNIT = /^[-−]?\$?(1000(\.0+)?(ms|K|M|B)|60(\.0+)?(s|m))$/;
  const EDGES = [999.5, 999.95, 59_950, 59_999, 3_570_000, 3_599_999, 999_500, 999_999, 999_999.5, 999_950_000, 999_999_999, 999_950_000_000];
  for (const [name, f] of Object.entries(ALL)) {
    it(name, () => {
      for (const v of EDGES) for (const x of [v, -v]) expect(f(x), `${name}(${x})`).not.toMatch(NEXT_UNIT);
    });
  }
  it('at the edges, the figures', () => {
    expect([999.4, 999.6, 59_940, 59_960, 3_569_000, 3_590_000].map(formatDuration)).toEqual(['999ms', '1.0s', '59.9s', '1m', '59m', '1.0h']);
    expect([999_999, 1_250_000, 1_000_000].map(AXIS_FORMATTERS.compact)).toEqual(['1M', '1.25M', '1M']);
    // An incident open for three weeks read "504.0h": past two days a duration is told in days.
    expect([47.9, 47.96, 72, 504].map((h) => formatDuration(h * 3_600_000))).toEqual(['47.9h', '2.0d', '3.0d', '21.0d']);
  });
});

/**
 * A figure that is not zero never reads as zero (#96, `formatCost`): an error rate of 0.003% is one a healthy API
 * holds, and "0.0%" says it had none. A percent too small for its places reads "<0.1%", the bound it is under, with
 * its own sign. A count, a duration and an amount at a glance round to the nearest whole by design (a tile shows "$0"
 * for forty cents and its tooltip the cents); a percent is a share and has no such tooltip.
 */
describe('a share that is not zero never reads as zero', () => {
  it('formatPercent, at every number of places', () => {
    for (const digits of [0, 1, 2]) for (const v of [1e-9, 0.00004, -0.00004]) {
      const out = formatPercent(v, digits);
      expect(out, `formatPercent(${v}, ${digits})`).toMatch(/[1-9]/);
      expect(out, `formatPercent(${v}, ${digits})`).toMatch(v < 0 ? /^[-−]/ : /^</);
    }
    expect([formatPercent(0.00003), formatPercent(0.00003, 2), formatPercent(-0.0003), formatPercent(0.0005), formatPercent(0.004, 0), formatPercent(0)]).toEqual(['<0.1%', '<0.01%', '-<0.1%', '0.1%', '<1%', '0.0%']);
  });
});

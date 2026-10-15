import { describe, expect, it } from 'vitest';
import { app } from '@/app.config';
import { niceTicks } from '@/components/charts/scale';
import { AXIS_FORMATTERS } from '@/lib/format';

// The symbol follows app.currency, so a rebranded product (--currency GBP) keeps this test green.
const symbol = new Intl.NumberFormat('en', { style: 'currency', currency: app.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')!.value;

/**
 * A money axis is true at every tick, as a count axis is: a tick at 2,500 reads $2.5K, never $3K, whatever the size of
 * the product's revenue, and both money entries of AXIS_FORMATTERS read a tick the same way.
 */
describe('a money axis', () => {
  for (const kind of ['cost', 'cost-compact'] as const) {
    it(`${kind}: reads the value each tick stands at`, () => {
      const axis = AXIS_FORMATTERS[kind];
      expect(axis(1_500)).toBe(`${symbol}1.5K`);
      expect(axis(2_500)).toBe(`${symbol}2.5K`);
      expect(axis(12_500)).toBe(`${symbol}12.5K`);
      expect(axis(1_250_000)).toBe(`${symbol}1.25M`);
      expect(axis(950_000_000)).toBe(`${symbol}950M`);
      expect(axis(5_000_000_000)).toBe(`${symbol}5B`);
      expect(axis(-1_500)).toBe(`-${symbol}1.5K`);
      expect(axis(0)).toBe(`${symbol}0`);
      expect(axis(12)).toBe(`${symbol}12`);
      expect(axis(0.5)).toBe(`${symbol}0.50`);
      expect(axis(null)).toBe('—');
    });

    it(`${kind}: never reads two ticks of one scale the same`, () => {
      for (const max of [800, 3_000, 7_500, 26_000, 140_000, 2_600_000, 41_000_000]) {
        for (const n of [4, 5, 6]) {
          const labels = niceTicks(max, n).map((t) => AXIS_FORMATTERS[kind](t));
          expect(new Set(labels).size, `${max} in ${n}: ${labels.join(' · ')}`).toBe(labels.length);
        }
      }
    });
  }
});

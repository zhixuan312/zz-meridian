import { describe, expect, it, vi } from 'vitest';

/**
 * `app.currency` is the product's, and an amount is written to its currency's own minor unit: the yen and the won have
 * none, the dinar has three. Every amount was written with two decimals, so a product in yen read `¥1,234.57` for an
 * amount that has no fraction to show and a product in dinars lost a digit of every one. An amount under one minor unit
 * still never reads as zero: it keeps two places more than the currency's own.
 */
async function formats(currency: string) {
  vi.resetModules();
  vi.doMock('@/app.config', async (orig) => {
    const m = await orig<typeof import('@/app.config')>();
    return { ...m, app: { ...m.app, currency } };
  });
  return import('@/lib/format');
}

describe('an amount in the product currency', () => {
  it('in dollars, two decimals', async () => {
    const f = await formats('USD');
    expect([1234.567, 0.004, 0, -42.5].map(f.formatCost)).toEqual(['$1,234.57', '$0.0040', '$0', '-$42.50']);
    expect(f.AXIS_FORMATTERS.cost(12.5)).toBe('$12.50');
  });
  it('in yen, no decimals, and an amount under a yen keeps two', async () => {
    const f = await formats('JPY');
    expect([1234.567, 12, 0.4, 0, -42.5].map(f.formatCost)).toEqual(['¥1,235', '¥12', '¥0.40', '¥0', '-¥43']);
    expect(f.AXIS_FORMATTERS.cost(12.5)).toBe('¥12.5');
    expect(f.splitFigure(f.formatCost(98_765))).toEqual({ pre: '¥', int: '98,765', frac: undefined, unit: undefined });
  });
  it('in dinars, three decimals', async () => {
    const f = await formats('KWD');
    expect([1234.5678, 0.0004].map(f.formatCost)).toEqual(['KWD1,234.568', 'KWD0.00040']);
  });
});

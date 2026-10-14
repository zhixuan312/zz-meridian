// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { facts } from '@/app.config';
import { first, record, steady } from '@/lib/facts';

/**
 * The band, the thresholds a first is counted against and the history a record needs are the product's configuration.
 * The rules read them from what they are handed: change a value and the rule answers differently.
 */
const day = (n: number) => new Date(Date.UTC(2025, 9, 8 + n)).toISOString().slice(0, 10);

describe('the configuration of the facts', () => {
  it('holds the band, the thresholds and the history, as the spec froze them', () => {
    expect(facts.band).toEqual({ p95Under: 350, errorRateUnder: 0.01 });
    expect(facts.firsts.requestsADay).toEqual([10_000_000, 25_000_000, 50_000_000]);
    expect(facts.recordNeedsPeriods).toBe(6);
  });

  it('the band decides which days are steady', () => {
    const days = [{ date: day(0), p95: 300, errors: 5, requests: 1000 }, { date: day(1), p95: 400, errors: 5, requests: 1000 }, { date: day(2), p95: 300, errors: 15, requests: 1000 }];
    expect(steady(days, facts.band)!.inside).toBe(1);
    expect(steady(days, { ...facts.band, p95Under: 450 })!.inside).toBe(2);
    expect(steady(days, { ...facts.band, errorRateUnder: 0.02 })!.inside).toBe(2);
  });

  it('the thresholds decide which first is stated', () => {
    const days = Array.from({ length: 200 }, (_, n) => ({ date: day(n), value: 19_000_000 + n * 100_000 }));
    const o = { what: 'Requests', format: String };
    expect(first(days, { ...o, thresholds: facts.firsts.requestsADay })!.threshold).toBe(25_000_000);
    expect(first(days, { ...o, thresholds: [...facts.firsts.requestsADay, 30_000_000] })!.threshold).toBe(30_000_000);
    expect(first(days, { ...o, thresholds: [10_000_000] })).toBeNull();
  });

  it('the history decides whether a period may be called a record', () => {
    const o = { what: '30 days of revenue', format: String };
    expect(record([1, 2, 3, 4, 5, 6], { ...o, needs: facts.recordNeedsPeriods })).not.toBeNull();
    expect(record([1, 2, 3, 4, 5, 6], { ...o, needs: facts.recordNeedsPeriods + 1 })).toBeNull();
    expect(record([1, 2, 3, 4, 5], { ...o, needs: facts.recordNeedsPeriods })).toBeNull();
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { run, steady } from '@/lib/facts';
import { formatDate } from '@/lib/format-date';

/**
 * The two rules of the six that are about the operation: how long a state has held, and how many days were inside the
 * band. Each returns its fact when its rule holds and nothing when it does not, and neither line holds a word of praise.
 */
const PRAISE = /\b(great|excellent|amazing|impressive|outstanding|congratulations|well done|good job|healthy|strong|solid|nice)\b/i;
const day = (n: number) => new Date(Date.UTC(2025, 9, 8 + n)).toISOString().slice(0, 10);
type State = 'operational' | 'degraded' | 'outage';
const strip = (length: number, marks: Record<number, State> = {}): State[] => Array.from({ length }, (_, i) => marks[i] ?? 'operational');

describe('a run', () => {
  it('is the days since the state was last anything else, and its longest when no run among the days kept is longer', () => {
    // Twenty good days, a mark, then 69 good days up to today.
    const fact = run(strip(90, { 20: 'degraded' }), 'operational', { name: 'Edge gateway' })!;
    expect([fact.kind, fact.length, fact.atLeast, fact.longest]).toEqual(['run', 69, false, true]);
    expect(fact.text).toContain('Edge gateway');
    expect(fact.text).toMatch(/\b69 days\b/);
    expect(fact.text).not.toMatch(/at least/);
  });

  it('is not its longest when an earlier run was longer', () => {
    const fact = run(strip(90, { 70: 'outage' }), 'operational', { name: 'Files' })!;
    expect([fact.length, fact.atLeast, fact.longest]).toEqual([19, false, false]);
    expect(fact.text).toMatch(/\b19 days\b/);
    expect(fact.text).not.toMatch(/longest/);
  });

  it('reads "at least" when it reaches the earliest day kept, and is never called the longest', () => {
    const fact = run(strip(90), 'operational', { name: 'Webhooks' })!;
    expect([fact.length, fact.atLeast, fact.longest]).toEqual([90, true, false]);
    expect(fact.text).toMatch(/\bat least 90 days\b/);
    expect(fact.text).not.toMatch(/longest/);
  });

  it('is nothing when today is not the good state, or no day is kept', () => {
    expect(run(strip(90, { 89: 'degraded' }), 'operational', { name: 'Inference API' })).toBeNull();
    expect(run([] as State[], 'operational', { name: 'Dashboard' })).toBeNull();
  });
});

describe('a steady', () => {
  const band = { p95Under: 350, errorRateUnder: 0.01 };
  const days = Array.from({ length: 360 }, (_, n) => ({ date: day(n), p95: 290, errors: 40, requests: 10_000 }));
  const marked = days.map((d, n) => (n === 313 ? { ...d, p95: 479 } : n === 348 || n === 349 ? { ...d, errors: 127 } : d));

  it('counts the days inside the band of those it is given, and names the days outside it by date', () => {
    const fact = steady(marked, band)!;
    expect([fact.kind, fact.inside, fact.of]).toEqual(['steady', 357, 360]);
    expect(fact.outside).toEqual([day(313), day(348), day(349)]);
    expect(fact.text).toMatch(/\b357 of 360 days\b/);
    for (const date of fact.outside) expect(fact.text).toContain(formatDate(date));
  });

  it('names no day when every day is inside', () => {
    const fact = steady(days, band)!;
    expect([fact.inside, fact.of, fact.outside]).toEqual([360, 360, []]);
    expect(fact.text).toMatch(/\b360 of 360 days\b/);
  });

  it('holds a day to both edges of the band: at the edge is outside', () => {
    const edge = [{ date: day(0), p95: 350, errors: 0, requests: 100 }, { date: day(1), p95: 349, errors: 1, requests: 100 }, { date: day(2), p95: 349, errors: 0, requests: 100 }];
    expect(steady(edge, band)!.outside).toEqual([day(0), day(1)]);
  });

  it('reads the band it is given, and is nothing when no day is kept', () => {
    expect(steady(marked, { p95Under: 500, errorRateUnder: 0.01 })!.inside).toBe(358);
    expect(steady(marked, { p95Under: 350, errorRateUnder: 0.02 })!.inside).toBe(359);
    expect(steady([], band)).toBeNull();
  });
});

describe('the two lines', () => {
  it('hold no word of praise', () => {
    const lines = [run(strip(90), 'operational', { name: 'Webhooks' }), run(strip(90, { 3: 'degraded' }), 'operational', { name: 'Edge gateway' }), steady([{ date: day(0), p95: 100, errors: 0, requests: 10 }], { p95Under: 350, errorRateUnder: 0.01 })];
    for (const fact of lines) {
      expect(fact).not.toBeNull();
      expect(fact!.text, fact!.text).not.toMatch(PRAISE);
    }
  });
});

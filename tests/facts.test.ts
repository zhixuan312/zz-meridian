// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { all, first, record, total } from '@/lib/facts';
import { formatCompact, formatCost } from '@/lib/format';
import { formatDate } from '@/lib/format-date';

/**
 * Four of the six rules that find a fact: a record, a first, an "all" and a total. Each returns its fact when its rule
 * holds and nothing when it does not, under its guard, and writes the fact's one line itself with the product's
 * formatters. No line holds a word of praise: the figure is what is said.
 */
const PRAISE = /\b(great|excellent|amazing|impressive|outstanding|congratulations|well done|good job|healthy|strong|solid|nice)\b/i;
const day = (n: number) => new Date(Date.UTC(2025, 9, 8 + n)).toISOString().slice(0, 10);
/** Twelve periods of 30 days of revenue, oldest first: each higher than the one before but the ninth, as the sample's are. */
const PERIODS = [1_472_102.65, 1_597_180.25, 1_735_282.45, 1_922_092.5, 2_107_368.12, 2_189_281.65, 2_431_820.25, 2_599_882.55, 2_357_960.83, 2_862_570.85, 3_134_643.55, 3_300_438.74];
const revenue = { needs: 6, what: '30 days of revenue', format: formatCost };

describe('a record', () => {
  it('is the latest period when it is higher than every one before it, with the run it ends', () => {
    const fact = record(PERIODS, revenue)!;
    expect(fact.kind).toBe('record');
    // The latest three are each the highest yet; the one before them fell short of the eighth.
    expect(fact.run).toBe(3);
    expect(fact.text).toContain('30 days of revenue');
    expect(fact.text).toContain(formatCost(3_300_438.74));
    expect(fact.text).toMatch(/\b3rd record in a row\b/);
  });

  it('says no run when the period before it was not a record', () => {
    const fact = record([...PERIODS.slice(0, 8), 2_357_960.83, 2_862_570.85], revenue)!;
    expect(fact.run).toBe(1);
    expect(fact.text).toContain(formatCost(2_862_570.85));
    expect(fact.text).not.toMatch(/in a row/);
  });

  it('is nothing when the latest period is not the highest, or only equals it', () => {
    expect(record(PERIODS.slice(0, 9), revenue)).toBeNull();
    expect(record([1, 2, 3, 4, 5, 6, 6], { ...revenue, format: String })).toBeNull();
  });

  it('needs the history the product asks for: one period short is no record, and no period short of it counts in a run', () => {
    expect(record([1, 2, 3, 4, 5], { ...revenue, format: String })).toBeNull();
    expect(record([1, 2, 3, 4, 5, 6], { ...revenue, format: String })!.run).toBe(1);
    expect(record([1, 2, 3, 4, 5, 6, 7], { ...revenue, format: String })!.run).toBe(2);
    expect(record([1, 2, 3, 4, 5, 6], { ...revenue, needs: 7, format: String })).toBeNull();
    expect(record([], revenue)).toBeNull();
  });

  it('writes the run as an ordinal, whatever its last digits', () => {
    // Each period is higher than the one before, so every period from the sixth on is a record: n periods end a run of n - 5.
    const rising = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    for (const [periods, nth] of [[9, '4th'], [16, '11th'], [17, '12th'], [18, '13th'], [26, '21st'], [27, '22nd'], [28, '23rd']] as const) {
      expect(record(rising(periods), { ...revenue, format: String })!.text, `${periods} periods`).toMatch(new RegExp(`, the ${nth} record in a row$`));
    }
  });
});

describe('a first', () => {
  const days = Array.from({ length: 300 }, (_, n) => ({ date: day(n), value: 19_000_000 + n * 80_000 }));
  const requests = { thresholds: [10_000_000, 25_000_000, 50_000_000], what: 'Requests', format: formatCompact };

  it('is the first day the largest threshold passed was passed, with the days that have passed it since', () => {
    const fact = first(days, requests)!;
    // 19,000,000 + 80,000 n is above 25,000,000 from n = 76; the 223 later days are all above it.
    expect([fact.kind, fact.threshold, fact.day, fact.daysSince]).toEqual(['first', 25_000_000, day(76), 223]);
    expect(fact.text).toContain(formatCompact(25_000_000));
    expect(fact.text).toContain(formatDate(day(76)));
    expect(fact.text).toMatch(/\b223 days\b/);
  });

  it('counts only the later days that passed it', () => {
    const dipped = days.map((d, n) => (n > 76 && n % 2 ? { ...d, value: 20_000_000 } : d));
    expect(first(dipped, requests)!.daysSince).toBe(111);
  });

  it('is nothing when the records begin above the largest threshold passed: the product cannot know its first day', () => {
    expect(first(days, { ...requests, thresholds: [10_000_000, 50_000_000] })).toBeNull();
  });

  it('is nothing when no threshold has been passed, and follows the thresholds it is given', () => {
    expect(first(days, { ...requests, thresholds: [50_000_000] })).toBeNull();
    expect(first([], requests)).toBeNull();
    expect(first(days, { ...requests, thresholds: [30_000_000] })!.day).toBe(day(138));
  });
});

describe('an all', () => {
  type Customer = { plan: string; grew: boolean };
  const of = (plan: string, n: number, grew: (i: number) => boolean): Customer[] => Array.from({ length: n }, (_, i) => ({ plan, grew: grew(i) }));
  const customers = [...of('Enterprise', 24, () => true), ...of('Scale', 82, (i) => i !== 5), ...of('Starter', 214, (i) => i % 3 > 0)];
  const sets = [{ label: '', members: customers }, ...['Enterprise', 'Scale', 'Starter'].map((plan) => ({ label: plan, members: customers.filter((c) => c.plan === plan) }))];
  const sent = { what: 'customers', did: 'sent more requests in the last 7 days than in the 7 before' };

  it('is the first set, in the order given, whose every member did it, written N of N', () => {
    const fact = all(sets, (c) => c.grew, sent)!;
    expect([fact.kind, fact.count, fact.label]).toEqual(['all', 24, 'Enterprise']);
    expect(fact.text).toContain('24 of 24 Enterprise customers');
    expect(fact.text).toContain(sent.did);
  });

  it('is the whole set when every member did it, and names no subset', () => {
    const fact = all(sets, () => true, sent)!;
    expect([fact.count, fact.label]).toEqual([320, '']);
    expect(fact.text).toContain('320 of 320 customers');
  });

  it('is nothing when every set is one short, or empty', () => {
    expect(all(sets, (c) => c.grew && c.plan !== 'Enterprise', sent)).toBeNull();
    expect(all([{ label: '', members: [] as Customer[] }], () => true, sent)).toBeNull();
    expect(all(sets.slice(2), (c) => c.grew, sent)).toBeNull();
  });
});

describe('a total', () => {
  const days = Array.from({ length: 360 }, (_, n) => ({ date: day(n), value: 20_000_000 + n }));
  const answered = { what: 'requests answered', format: (n: number) => n.toLocaleString('en-US') };

  it('is the sum of everything recorded, every digit, from its first day to its latest', () => {
    const fact = total(days, answered)!;
    expect([fact.kind, fact.sum]).toEqual(['total', 7_200_064_620]);
    expect(fact.text).toContain('7,200,064,620 requests answered');
    expect(fact.text).toContain('360 days');
    expect(fact.text).toContain(formatDate(day(0)));
    expect(fact.text).toContain(formatDate(day(359)));
  });

  it('is nothing when nothing is recorded', () => {
    expect(total([], answered)).toBeNull();
  });
});

describe('a fact\'s line', () => {
  it('holds no word of praise, whatever the rule and the figures', () => {
    const lines = [
      record(PERIODS, revenue), record([1, 2, 3, 4, 5, 6, 7], { ...revenue, format: String }),
      first(Array.from({ length: 40 }, (_, n) => ({ date: day(n), value: 9_000_000 + n * 100_000 })), { thresholds: [10_000_000], what: 'Requests', format: formatCompact }),
      all([{ label: 'Scale', members: [1, 2, 3] }], () => true, { what: 'customers', did: 'paid on time' }),
      total([{ date: day(0), value: 5 }, { date: day(1), value: 7 }], { what: 'requests answered', format: String }),
    ];
    for (const fact of lines) {
      expect(fact).not.toBeNull();
      expect(fact!.text.length).toBeGreaterThan(0);
      expect(fact!.text, fact!.text).not.toMatch(PRAISE);
    }
  });
});

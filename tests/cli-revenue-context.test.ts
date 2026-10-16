// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { formatCost } from '@/lib/format';
import type { Period } from '@/lib/period';
import { contextText } from '@/lib/shared-context';
import { CUSTOMERS, DAYS, REGIONS, USAGE, demoSeries, demoTotals } from '@/system/fixtures/company';
import { MODELS } from '@/system/fixtures/sample';
import { customerFigures } from '@/views/customers-context';
import { revenueContext } from '@/views/revenue-context';
import { revenueData, type RevenueReads } from '@/views/revenue-parts';

const BUDGET = 2600;
const NOW = '2026-10-03T09:00:00Z';
/** Revenue's data as its read builds it from the sample, with each read the test leaves out as one that failed. */
const reads = (period: Period, over: Partial<RevenueReads> = {}): RevenueReads => {
  const { current, running } = demoSeries(period);
  return { period, days: { series: current, totals: demoTotals(period), running }, history: DAYS, customers: CUSTOMERS, usage: USAGE, models: MODELS, regions: REGIONS, updatedAt: '2026-10-03T08:56:00Z', now: NOW, ...over };
};
const context = (period: Period, over?: Partial<RevenueReads>) => revenueContext(revenueData(reads(period, over)));

describe("Revenue's context", () => {
  it('names its address and the period, and states the four tiles, who pays and the customers', () => {
    const c = context('30d');
    expect(c.address).toBe('/business?period=30d');
    const fact = (label: string) => c.facts.find((f) => f.label === label);
    expect(fact('Revenue')!.value).toBe(formatCost(demoTotals('30d').current.revenue));
    expect(fact('Revenue')!.change).toMatch(/^up [\d.]+% vs the previous 30 days$/);
    expect(fact('Against a year ago')!.value).toMatch(/^\+[\d.]+% against 08 Oct to 06 Nov 2025, the first 30 days kept$/);
    expect(fact('Best day yet')!.value).toMatch(/^\$[\d,.]+ on \d\d \w+ \d{4}; \d+ of the 10 best kept are in the period$/);
    const { pastDue } = customerFigures(CUSTOMERS);
    expect(fact('Past due')!.value).toMatch(new RegExp(`^${pastDue.length}, [\\d.]+% of the revenue of the last 30 days$`));
    expect(fact('Who pays')!.value).toMatch(/^Enterprise \$[\d.]+[KM], [\d.]+%, 24 customers; Scale /);
    expect(fact('Every customer, the last 14 days')!.value).toMatch(/^\d+ of \d+ sent more this week than last; largest: Northwind Labs /);
    expect(fact('From a trial to Enterprise')!.value).toMatch(/14 joined, 1 moved up and none left in the 30 days to 02 Oct 2026$/);
  });

  it('leads with the title its page is headed by, then the record and the lines worth a look', () => {
    const c = context('30d');
    expect(c.insights[0]).toEqual({ text: 'All 24 Enterprise customers sent more this week than last, in the highest 30 days yet' });
    expect(c.insights[1].text).toMatch(/^Record: The highest 30 days of revenue yet, the \d+(st|nd|rd|th) record in a row\.$/);
    // The figure the record is about is not repeated in the insight: the card's own figure and caption state it, and the
    // context states it as a fact ("Revenue: $3,300,438.74") a reader or an agent reads either way.
    expect(c.facts.map((f) => f.value).join(' ')).toContain(formatCost(3_300_438.74));
    expect(c.insights[2]).toEqual({ text: expect.stringMatching(/^10 customers are past due, the largest Juniperth Travel, /), evidence: '/customers/juniperth-travel' });
    // One Enterprise customer short and the next plan is tried; with none, the title says who paid what against the 30 days before.
    const flat = CUSTOMERS.map((customer) => ({ ...customer, trend: customer.trend.map(() => 1) }));
    expect(context('30d', { customers: flat }).insights[0].text).toBe(`320 customers paid ${formatCost(customerFigures(CUSTOMERS).revenue)} in 30 days, 5.3% more than the 30 days before`);
  });

  it('carries the wall in the order chosen, and none of the others', () => {
    const data = revenueData(reads('30d'));
    const wall = (order: 'largest' | 'fell' | 'growing') => revenueContext(data, order).facts.find((f) => f.label === 'Every customer, the last 14 days')!.value;
    expect(wall('fell')).toMatch(/; fell this week: /);
    expect(wall('fell')).not.toMatch(/largest|growing fastest/);
    expect(wall('growing')).toMatch(/; growing fastest: /);
  });

  it('fits the budget every context is held to, at every period', () => {
    for (const period of ['7d', '30d', '90d', 'all'] as const) expect(contextText(context(period)).length, period).toBeLessThanOrEqual(BUDGET);
  });

  it('says a read that failed could not be read, and the rest stands', () => {
    const c = context('30d', { usage: null, regions: null });
    expect(c.unknowns[0]).toBe('The usage by model and the regions could not be read, so what they state is missing, not zero.');
    expect(c.facts.map((f) => f.label)).not.toContain('What they buy');
    expect(c.facts.map((f) => f.label)).toContain('Revenue');
  });

  it('says when nothing has arrived, and that All has nothing before it', () => {
    const none = context('30d', { days: { series: [], totals: { current: { requests: 0, errorRate: 0, p95: 0, revenue: 0 }, previous: null }, running: null }, history: [], customers: [] });
    expect(none.unknowns).toContain('Nothing has arrived yet: no customer and no complete day is kept.');
    const all = context('all');
    expect(all.facts.find((f) => f.label === 'Against a year ago')!.value).toBe('The period is every day kept, so none comes before it');
    expect(all.unknowns).toContain('No previous period is kept, so no figure has a change.');
  });
});

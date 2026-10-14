// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { formatCost } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
import { CUSTOMERS, demoSeries } from '@/system/fixtures/company';
import { customerFigures } from '@/views/customers-context';
import { revenueContext, revenueHead, type RevenueData } from '@/views/revenue-context';

const BUDGET = 2600;
const data = (rows: typeof CUSTOMERS): RevenueData => {
  const { customers, revenue, pastDue } = customerFigures(rows);
  return { customers, revenue, pastDue: pastDue.map((c) => ({ name: c.name, revenue: c.revenue })), head: revenueHead({ rows, history: demoSeries('all').current }), updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' };
};

describe("Revenue's context", () => {
  it('names its address and carries the three figures of the Customers page, worked out once', () => {
    const c = revenueContext(data(CUSTOMERS));
    const { customers, revenue, pastDue } = customerFigures(CUSTOMERS);
    expect(c.address).toBe('/business');
    expect(c.facts.map((f) => f.value)).toEqual([String(customers), formatCost(revenue), expect.stringMatching(new RegExp(`^${pastDue.length}: `))]);
    expect(contextText(c)).toContain(pastDue[0].name);
  });

  it('leads with the title its page is headed by: the first set whose every customer sent more this week, the largest plan first', () => {
    const c = revenueContext(data(CUSTOMERS));
    expect(c.insights).toEqual([{ text: 'All 24 Enterprise customers sent more this week than last, in the highest 30 days yet' }]);
    // One Enterprise customer short and the next plan is tried; with none, the title says who paid what against the 30 days before.
    const flat = CUSTOMERS.map((customer) => ({ ...customer, trend: customer.trend.map(() => 1) }));
    expect(revenueContext(data(flat)).insights[0].text).toBe(`320 customers paid ${formatCost(customerFigures(CUSTOMERS).revenue)} in 30 days, 5.3% more than the 30 days before`);
  });

  it('fits the budget every context is held to', () => {
    expect(contextText(revenueContext(data(CUSTOMERS))).length).toBeLessThanOrEqual(BUDGET);
  });

  it('says when there are no customers, and that every invoice is paid when none is past due', () => {
    const none = revenueContext(data([]));
    expect(none.unknowns[0]).toBe('There are no customers yet.');
    expect(none.facts[2].value).toBe('0, every invoice is paid');
    expect(none.facts[0].value).toBe('0');
  });
});

// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { describe, expect, it } from 'vitest';
import { formatCost } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
import { CUSTOMERS } from '@/system/fixtures/sample-records';
import { customerFigures } from '@/views/customers-context';
import { revenueContext, type RevenueData } from '@/views/revenue-context';

const BUDGET = 2600;
const data = (rows: typeof CUSTOMERS): RevenueData => {
  const { customers, spend, pastDue } = customerFigures(rows);
  return { customers, spend, pastDue: pastDue.map((c) => ({ name: c.name, spend: c.spend })), updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' };
};

describe("Revenue's context", () => {
  it('names its address and carries the three figures of the Customers page, worked out once', () => {
    const c = revenueContext(data(CUSTOMERS));
    const { customers, spend, pastDue } = customerFigures(CUSTOMERS);
    expect(c.address).toBe('/business');
    expect(c.facts.map((f) => f.value)).toEqual([String(customers), formatCost(spend), expect.stringMatching(new RegExp(`^${pastDue.length}: `))]);
    expect(contextText(c)).toContain(pastDue[0].name);
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

// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { formatCost } from '@/lib/format';
import { contextText } from '@/lib/shared-context';
import { CUSTOMERS, demoTotals } from '@/system/fixtures/company';
import { REQUESTS } from '@/system/fixtures/sample';
import { customerContext, titleOf } from '@/logic/customer-context';
import { PAGES } from '@/system/content';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUDGET = 2600;
const at = { updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' };
/** Every part the page reads, at its fullest: the product's 30 days and five requests from the sampled log. */
const { revenue, errorRate } = demoTotals('30d').current;
const full = { product: { revenue, errorRate }, latest: REQUESTS.slice(0, 5), ...at };

describe("One customer's context", () => {
  it("names the customer's own address and what the page shows of it, within its budget for every customer", () => {
    for (const customer of CUSTOMERS) {
      const c = customerContext({ customer, ...full });
      const text = contextText(c);
      expect(c.address, customer.id).toBe(`/customers/${customer.id}`);
      expect(c.title).toBe(customer.name);
      expect(text, customer.id).toContain(customer.plan);
      expect(text, customer.id).toContain(customer.region);
      expect(text, customer.id).toContain(customer.owner);
      expect(text, customer.id).toContain(REQUESTS[0].id);
      expect(text.length, customer.id).toBeLessThanOrEqual(BUDGET);
      // With the parts it could not read, it says so instead, and stays within the budget too.
      const partial = contextText(customerContext({ customer, product: null, latest: null, ...at }));
      expect(partial, customer.id).toMatch(/sampled log could not be read/);
      expect(partial.length, customer.id).toBeLessThanOrEqual(BUDGET);
    }
  });

  it("states its share of the product's revenue and the product's error rate over the same 30 days", () => {
    const [largest] = CUSTOMERS;
    const text = contextText(customerContext({ customer: largest, ...full }));
    expect(text).toContain(`${formatCost(largest.revenue)}, ${(100 * largest.revenue / revenue).toFixed(1)}% of the product's revenue over the same days`);
    expect(text).toContain(`against the product's ${(100 * errorRate).toFixed(2)}%`);
    // A part the reader may not read is not stated at all, and nothing says it is missing.
    const bare = contextText(customerContext({ customer: largest, ...at }));
    expect(bare).not.toMatch(/of the product's|could not be read|Its latest requests/);
  });

  it('leads with the title its page is headed by', () => {
    for (const customer of CUSTOMERS) expect(customerContext({ customer, ...at }).insights[0], customer.id).toEqual({ text: titleOf(customer) });
    const [largest] = CUSTOMERS;
    expect(titleOf(largest)).toMatch(new RegExp(`^${largest.name} paid \\$[\\d,.]+ in 30 days and sent [\\d.]+% (more|less) this week than last$`));
  });

  it('says what a week is where the title states how it moved, how it moved where the title does not, and nothing when there is no trend', () => {
    const [largest] = CUSTOMERS;
    expect(customerContext({ customer: largest, ...at }).insights[1]).toEqual({ text: 'This week is its requests over the last 7 days, and last week the 7 before.', evidence: `/requests?q=${encodeURIComponent(largest.name)}` });
    const trial = CUSTOMERS.find((c) => c.status === 'trial')!;
    expect(customerContext({ customer: trial, ...at }).insights[1].text).toMatch(/^Its requests are (up|down) \d+% over the last 7 days against the 7 before\.$/);
    expect(customerContext({ customer: { ...largest, trend: [] }, ...at }).insights).toEqual([{ text: `${largest.name} paid ${formatCost(largest.revenue)} in 30 days` }]);
    // A customer that has left has no week: its title says when it left, and nothing follows.
    const left = CUSTOMERS.find((c) => c.status === 'left')!;
    expect(customerContext({ customer: left, ...at }).insights).toHaveLength(1);
  });
});

describe("the customer page's addresses", () => {
  it('names real customers in the Atlas and in the pages built ahead of time', () => {
    const ids = new Set(CUSTOMERS.map((c) => c.id));
    expect(ids.has(PAGES.find((p) => p.id === 'customer')!.route.split('/').pop()!)).toBe(true);
    const page = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/customers/[id]/page.tsx'), 'utf8');
    const prebuilt = [...page.slice(page.indexOf('generateStaticParams')).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).slice(0, 3);
    expect(prebuilt.length).toBe(3);
    for (const id of prebuilt) expect(ids.has(id), id).toBe(true);
  });
});

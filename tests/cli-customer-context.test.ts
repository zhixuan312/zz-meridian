// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { contextText } from '@/lib/shared-context';
import { CUSTOMERS } from '@/system/fixtures/company';
import { customerContext } from '@/views/customer-context';
import { PAGES } from '@/system/content';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUDGET = 2600;
const at = { updatedAt: '2026-10-03T08:56:00Z', now: '2026-10-03T09:00:00Z' };

describe("One customer's context", () => {
  it("names the customer's own address and what the page shows of it", () => {
    for (const customer of CUSTOMERS) {
      const c = customerContext({ customer, ...at });
      const text = contextText(c);
      expect(c.address, customer.id).toBe(`/customers/${customer.id}`);
      expect(c.title).toBe(customer.name);
      expect(text, customer.id).toContain(customer.plan);
      expect(text, customer.id).toContain(customer.region);
      expect(text.length, customer.id).toBeLessThanOrEqual(BUDGET);
    }
  });

  it('says how the last 7 days moved against the 7 before, and nothing when there is no trend', () => {
    expect(customerContext({ customer: CUSTOMERS[0], ...at }).insights[0].text).toMatch(/^Its requests are (up|down) \d+% over the last 7 days against the 7 before\.$/);
    expect(customerContext({ customer: { ...CUSTOMERS[0], trend: [] }, ...at }).insights).toEqual([]);
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

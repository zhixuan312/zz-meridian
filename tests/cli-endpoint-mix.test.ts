// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own records, which a product replaces.
import { describe, expect, it } from 'vitest';
import { CUSTOMERS, ENDPOINTS } from '@/system/fixtures/company';
import { REQUESTS } from '@/system/fixtures/sample';

/**
 * A customer's 30-day mix of requests by route (`byEndpoint`) and the sampled request log are one company's records, so
 * they agree (FR-45, AC-14.7): a route a customer's sampled request hit is a route its mix counts, and the mix still sums
 * to the customer's requests and, route by route, to the endpoints'.
 */
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const byName = new Map(CUSTOMERS.map((c) => [c.name, c]));

describe("the sample's endpoint mix agrees with its request log", () => {
  it('counts above zero, in its customer\'s mix, the route of every sampled request', () => {
    const missing = REQUESTS.filter((r) => !((byName.get(r.customer)?.byEndpoint[r.route] ?? 0) > 0)).map((r) => `${r.id} ${r.customer} ${r.route}`);
    expect(REQUESTS.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it("names, in every sampled request, a customer the product keeps", () => {
    expect(REQUESTS.filter((r) => !byName.has(r.customer)).map((r) => r.customer)).toEqual([]);
  });

  it("sums each customer's mix to its requests, and each route across the customers to the endpoint's", () => {
    for (const c of CUSTOMERS) expect(sum(Object.values(c.byEndpoint)), c.name).toBe(c.requests);
    for (const e of ENDPOINTS) expect(sum(CUSTOMERS.map((c) => c.byEndpoint[e.route] ?? 0)), e.route).toBe(e.requests);
  });
});

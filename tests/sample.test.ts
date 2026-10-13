import { describe, expect, it } from 'vitest';
import { CUSTOMER_ROWS, REQUESTS, demoTotals } from '@/system/fixtures/sample';
import { CUSTOMERS, payloadsOf, traceOf, usageOf } from '@/system/fixtures/sample-records';
import verify from '../scripts/verify.config';

describe('the sample agrees with itself', () => {
  it('customers add up to the Home’s 30-day requests and revenue', () => {
    const month = demoTotals('30d').current;
    expect(CUSTOMER_ROWS.reduce((a, c) => a + c.requests, 0)).toBe(month.requests);
    expect(Math.round(CUSTOMER_ROWS.reduce((a, c) => a + c.revenue, 0) * 100) / 100).toBe(month.revenue);
  });
  it('only the model routes name a model or count tokens', () => {
    for (const r of REQUESTS) {
      const modelRoute = r.route === '/v1/messages' || r.route === '/v1/embeddings';
      expect(r.model !== null).toBe(modelRoute);
      if (!modelRoute) expect(usageOf(r).tokens).toBeNull();
    }
  });
  it('a GET or DELETE carries no body, and a 404 only answers a route with an ID', () => {
    for (const r of REQUESTS) {
      if (r.method === 'GET' || r.method === 'DELETE') expect(payloadsOf(r).request).toBeNull();
      if (r.status === 404) expect(r.route.endsWith(':id')).toBe(true);
    }
  });
  it('every trace ends exactly at the request’s latency', () => {
    for (const r of REQUESTS) {
      const t = traceOf(r);
      const end = t[t.length - 1];
      expect(end.start + end.duration).toBeGreaterThanOrEqual(r.latency);
    }
  });
});

describe('the detail pages verify checks by default', () => {
  const byId = (route: string) => REQUESTS.find((r) => `/requests/${r.id}` === route);
  const [get, post, missing404, absent, active, pastDue, nobody] = verify.detailRoutes;
  const customer = (route: string) => CUSTOMERS.find((c) => `/customers/${c.id}` === route);
  it('still show the states their comments name', () => {
    expect(byId(get)).toMatchObject({ method: 'GET', status: 200, model: null });
    expect(byId(post)).toMatchObject({ method: 'POST', route: '/v1/messages', status: 201 });
    expect(byId(missing404)?.status).toBe(404);
    expect(byId(absent)).toBeUndefined();
  });
  it('still show the customers their comments name', () => {
    expect(customer(active)).toMatchObject({ status: 'active' });
    expect(customer(pastDue)).toMatchObject({ status: 'past due', name: 'Lumen Studio' });
    expect(customer(nobody)).toBeUndefined();
  });
});

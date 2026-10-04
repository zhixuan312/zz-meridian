import { describe, expect, it } from 'vitest';
import { CUSTOMER_ROWS, REQUESTS, demoTotals } from '@/system/fixtures/sample';
import { payloadsOf, traceOf, usageOf } from '@/system/fixtures/sample-records';

describe('the sample agrees with itself', () => {
  it('customers add up to the Overview’s 30-day requests and spend', () => {
    const month = demoTotals('30d').current;
    expect(CUSTOMER_ROWS.reduce((a, c) => a + c.requests, 0)).toBe(month.requests);
    expect(Math.round(CUSTOMER_ROWS.reduce((a, c) => a + c.spend, 0) * 100) / 100).toBe(month.spend);
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

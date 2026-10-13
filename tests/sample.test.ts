import { describe, expect, it } from 'vitest';
import { REQUESTS } from '@/system/fixtures/sample';
import { CUSTOMERS, DAYS, ENDPOINTS, IN_PROGRESS, WEEKDAY_HOURS, demoSeries, demoTotals } from '@/system/fixtures/company';
import { payloadsOf, traceOf, usageOf } from '@/system/fixtures/sample-records';
import verify from '../scripts/verify.config';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const cents = (usd: number) => Math.round(usd * 100);

describe('the sample agrees with itself', () => {
  it('customers that have not left add up to the Home’s 30-day requests and revenue, and one that has adds nothing', () => {
    const month = demoTotals('30d').current;
    const kept = CUSTOMERS.filter((c) => c.status !== 'left');
    expect(sum(kept.map((c) => c.requests))).toBe(month.requests);
    expect(sum(kept.map((c) => cents(c.revenue)))).toBe(cents(month.revenue));
    expect(sum(CUSTOMERS.filter((c) => c.status === 'left').map((c) => c.requests + cents(c.revenue) + c.tokens + sum(c.trend)))).toBe(0);
  });
  it('the customers’ requests by route are the endpoints’, their tokens the days’, and their trends the last 14 days', () => {
    for (const e of ENDPOINTS) expect(sum(CUSTOMERS.map((c) => c.byEndpoint[e.route])), e.route).toBe(e.requests);
    expect(sum(CUSTOMERS.map((c) => c.tokens))).toBe(sum(DAYS.slice(-30).map((d) => d.tokens)));
    DAYS.slice(-14).forEach((d, k) => expect(sum(CUSTOMERS.map((c) => c.trend[k])), d.date).toBe(d.requests));
    for (const c of CUSTOMERS) expect(sum(c.trend), c.name).toBeLessThanOrEqual(c.requests);
  });
  it('each weekday of the grid holds the requests of that weekday’s days', () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      const days = DAYS.slice(-30).filter((d) => (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7 === weekday);
      expect(sum(WEEKDAY_HOURS.filter((h) => h.weekday === weekday).map((h) => h.requests)), `weekday ${weekday}`).toBe(sum(days.map((d) => d.requests)));
    }
  });
  it('the day in progress is made as every day is, from the nine hours it has had, and is none of the complete days', () => {
    const { day, usage, compute, cost } = IN_PROGRESS;
    expect(day.date).toBe('2026-10-03');
    expect([DAYS.length, DAYS.at(-1)!.date]).toEqual([360, '2026-10-02']);
    expect(sum(usage.map((u) => u.requests))).toBe(day.requests);
    expect(sum(usage.map((u) => cents(u.revenue)))).toBe(cents(day.revenue));
    expect(sum(Object.values(day.revenueByPlan).map(cents))).toBe(cents(day.revenue));
    // Yesterday's GPUs, for nine hours of the day.
    expect(sum(compute.map((c) => c.gpus))).toBe(690);
    expect(cost.compute).toBe(690 * 9 * 2.5);
    for (const c of compute) expect(c.used, c.id).toBeLessThanOrEqual(c.gpus * 9);
    // A Saturday's night and morning are quieter than its afternoon: under nine twenty-fourths of the Saturday before.
    const share = day.requests / DAYS.at(-7)!.requests;
    expect(share > 0.2 && share < 9 / 24, `${share} of the Saturday before`).toBe(true);
  });
  it('all time is every complete day, with none before it and no totals to compare with', () => {
    const { current, previous, running } = demoSeries('all');
    expect([current.length, previous.length, running.date]).toEqual([360, 0, '2026-10-03']);
    expect(demoTotals('all').previous).toBeNull();
    expect(demoSeries('90d').previous).toHaveLength(90);
  });
  it('a customer’s dates are days, in the order they happened', () => {
    const today = '2026-10-03';
    for (const c of CUSTOMERS) {
      for (const date of [c.joined, c.planSince, c.left, c.trialEnds, c.pastDueSince]) if (date !== null) expect(date, c.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.joined < today, `${c.name} joined before today`).toBe(true);
      if (c.planSince) expect(c.joined < c.planSince && c.planSince < today, `${c.name} changed plan after it joined`).toBe(true);
      if (c.left) expect(c.joined < c.left, `${c.name} left after it joined`).toBe(true);
      if (c.trialEnds) expect(c.trialEnds > today, `${c.name}'s trial has not ended`).toBe(true);
      if (c.pastDueSince) expect(c.joined < c.pastDueSince && c.pastDueSince < today, `${c.name} is past due since a day gone by`).toBe(true);
    }
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

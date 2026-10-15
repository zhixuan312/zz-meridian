import { describe, expect, it } from 'vitest';
import { DEMO_NOW, INCIDENTS, MODELS, REQUESTS, SERVICES, uptimeOf } from '@/system/fixtures/sample';
import { CUSTOMERS, DAYS, ENDPOINTS, IN_PROGRESS, WEEKDAY_HOURS, demoSeries, demoTotals } from '@/system/fixtures/company';
import { TICKETS } from '@/system/fixtures/sample-engineering';
import { MEMBERS } from '@/system/fixtures/sample-members';
import { PAST_INCIDENTS } from '@/system/fixtures/sample-ops';
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
  it('every trace ends at or after the request’s latency, never before it', () => {
    for (const r of REQUESTS) {
      const t = traceOf(r);
      const end = t[t.length - 1];
      expect(end.start + end.duration).toBeGreaterThanOrEqual(r.latency);
    }
  });
});

describe('the records that name each other', () => {
  // The latest resolved incident is in both lists.
  const incidents = [...new Map([...INCIDENTS, ...PAST_INCIDENTS].map((i) => [i.id, i])).values()];
  it('an incident and its ticket name each other, and whoever has an incident is a member', () => {
    for (const i of incidents) {
      if (i.owner !== null) expect(MEMBERS.map((m) => m.name), `${i.id} is owned by a member`).toContain(i.owner);
      if (i.ticketId !== null) expect(TICKETS.find((t) => t.id === i.ticketId)?.incidentId, `${i.ticketId} names ${i.id} back`).toBe(i.id);
    }
    for (const t of TICKETS) if (t.incidentId !== null) expect(incidents.find((i) => i.id === t.incidentId)?.ticketId, `${t.incidentId} names ${t.id} back`).toBe(t.id);
    // The sample shows each case a page may meet: an owner and a ticket, an owner alone, and neither.
    expect(incidents.map((i) => [i.state !== 'resolved', i.owner !== null, i.ticketId !== null])).toEqual([[true, true, true], [false, true, false], [false, true, false], [false, false, false]]);
  });
  it('a closed ticket was closed the last time it changed, and no other ticket was closed', () => {
    for (const t of TICKETS) expect(t.closedAt, t.id).toBe(t.state === 'closed' ? t.updatedAt : null);
  });
  it('a request has a first token exactly where a model that writes tokens answered it, inside its latency', () => {
    const writes = new Set(MODELS.filter((m) => m.outputPrice !== null).map((m) => m.id));
    for (const r of REQUESTS) {
      // The embedding model writes no tokens, so its requests have no first one, as its rows of usage have none.
      expect(r.ttft !== null, `${r.id}: ${r.model} answered ${r.status}`).toBe(r.model !== null && writes.has(r.model) && r.status < 400);
      if (r.ttft !== null) expect(r.ttft >= 1 && r.ttft <= r.latency, `${r.id}: ${r.ttft} ms of ${r.latency}`).toBe(true);
    }
    expect(REQUESTS.some((r) => r.model === 'meridian-embed' && r.status < 400), 'the log holds an embedding request that was answered').toBe(true);
  });
  it('a request costs its tokens at its model\'s prices, a call the price of a call, and a refused one nothing', () => {
    const [large, swift, embed, none] = MODELS;
    const one = (model: string | null, refused = false) => REQUESTS.find((r) => r.model === model && r.status >= 400 === refused)!;
    const tokens = (model: string) => usageOf(one(model)).tokens!;
    expect(usageOf(one('meridian-large')).cost).toBeCloseTo((tokens('meridian-large').input * 2 + tokens('meridian-large').output * 10) / 1e6, 12);
    expect(usageOf(one('meridian-swift')).cost).toBeCloseTo((tokens('meridian-swift').input * 0.5 + tokens('meridian-swift').output * 2.5) / 1e6, 12);
    expect(usageOf(one('meridian-embed'))).toEqual({ tokens: { input: 18, output: 0 }, cost: (18 * 0.1) / 1e6 });
    expect(usageOf(one(null))).toEqual({ tokens: null, cost: 0.0001 });
    for (const model of ['meridian-large', null]) expect(usageOf(one(model, true)), `${model}, refused`).toEqual({ tokens: null, cost: 0 });
    // The prices are the models', not a list of the function's own.
    expect([large.inputPrice, large.outputPrice, swift.inputPrice, swift.outputPrice, embed.inputPrice, none.callPrice]).toEqual([2, 10, 0.5, 2.5, 0.1, 0.0001]);
  });
  it('a service\'s uptime is what its marked days cost: half an hour a degraded day, two hours a day of outage', () => {
    for (const s of SERVICES) expect(s.uptime, s.name).toBe(uptimeOf(s.days));
    expect(Object.fromEntries(SERVICES.map((s) => [s.name, s.uptime]))).toEqual({ 'Edge gateway': 0.99954, 'Inference API': 0.99931, Embeddings: 0.99954, Files: 0.99884, Webhooks: 0.99954, Dashboard: 0.99977 });
    const strip = (state: 'operational' | 'degraded' | 'outage') => Array.from({ length: 90 }, () => state);
    expect([uptimeOf(strip('operational')), uptimeOf([...strip('operational').slice(1), 'degraded']), uptimeOf(strip('degraded')), uptimeOf(strip('outage'))]).toEqual([1, 0.99977, 0.97917, 0.91667]);
  });
  it('a service\'s last day is its state now, and the three days outside the band are marked where they fell', () => {
    for (const s of SERVICES) expect(s.days.at(-1), s.name).toBe(s.status);
    const marked = (name: string) => SERVICES.find((s) => s.name === name)!.days.flatMap((d, i) => (d === 'operational' ? [] : [`${new Date(DEMO_NOW.getTime() - (89 - i) * 86_400_000).toISOString().slice(0, 10)} ${d}`]));
    expect(marked('Inference API')).toEqual(['2026-09-21 degraded', '2026-09-22 degraded', '2026-10-03 degraded']);
    expect(marked('Files')).toContain('2026-08-17 outage');
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

// @vitest-environment node
// Named cli-* so the payload leaves it out: it holds the sample company's own records and figures.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { clock, collections } from '@/data/collections';
import { customerFigures } from '@/logic/customers-context';

/**
 * The sample is one company, priced once. Every figure a page shows comes from these records, so the records must agree
 * with each other before any page is built on them: revenue is tokens times a price, the same total whichever way it is
 * cut, and the things the pages will state (a record, a day outside the band, a customer that pays a tenth) are in the
 * records to be found, not typed into a page.
 */
/** A row of any collection, read as the product stores it. */
type Row = Record<string, any>;
const rows = async (name: string): Promise<Row[]> => {
  const c = collections.find((x) => x.name === name);
  if (!c) throw new Error(`the product has no collection "${name}"`);
  return (await c.query({})).rows as Row[];
};
const cents = (usd: number) => Math.round(usd * 100);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const DAY = 86_400_000;
const today = clock().toISOString().slice(0, 10);
const back = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
/** `n` complete days, oldest first, ending `skip` days before yesterday. */
const span = (n: number, skip = 0) => Array.from({ length: n }, (_, i) => back(skip + n - i));
const LAST_30 = new Set(span(30));
const kept = (c: Row) => c.status !== 'left';

const NAMES_OF_0_15 = ['Northwind Labs', 'Halcyon Health', 'Atlas Freight', 'Mosaic Learning', 'Quill & Co', 'Parallax AI', 'Fernway Bank', 'Orbit Retail', 'Tessellate', 'Lumen Studio', 'Kestrel Systems', 'Brightline'];
const ROUTES = ['/v1/documents/:id', '/v1/embeddings', '/v1/files', '/v1/messages', '/v1/search', '/v1/sessions/:id', '/v1/webhooks/:id'];
const REGIONS = ['ap-southeast-1', 'eu-west-1', 'us-east-1', 'us-west-2'];

describe('the company is priced once', () => {
  it('sells three models and a call, at the prices the spec froze', async () => {
    const models = Object.fromEntries((await rows('models')).map((m) => [m.id, [m.inputPrice, m.outputPrice, m.callPrice]]));
    expect(models).toEqual({
      'meridian-large': [2, 10, null],
      'meridian-swift': [0.5, 2.5, null],
      'meridian-embed': [0.1, null, null],
      none: [null, null, 0.0001],
    });
  });

  it('prices a model\'s day as its tokens times its price, and a day of calls that reach no model as its calls', async () => {
    const models = Object.fromEntries((await rows('models')).map((m) => [m.id, m]));
    const usage = await rows('usage');
    expect(usage.length).toBeGreaterThan(0);
    for (const u of usage) {
      const m = models[u.model];
      expect(m, `${u.id} names a model the product sells`).toBeTruthy();
      expect(u.id).toBe(`${u.date}:${u.model}`);
      const priced = m.callPrice !== null ? u.requests * m.callPrice : (u.inputTokens * m.inputPrice + u.outputTokens * (m.outputPrice ?? 0)) / 1e6;
      expect(Math.abs(u.revenue - priced), `${u.id}: ${u.revenue} against ${priced}`).toBeLessThanOrEqual(0.005 + 1e-9);
      if (m.outputPrice === null) expect(u.outputTokens, `${u.id} has no output to price`).toBe(0);
      if (m.callPrice !== null) expect(u.inputTokens + u.outputTokens, `${u.id} reaches no model`).toBe(0);
      expect([u.ttft !== null, u.tps !== null], `${u.id}: a time to first token and a rate where the model writes tokens, and nowhere else`).toEqual([m.outputPrice !== null, m.outputPrice !== null]);
    }
  });

  it('says the same revenue, requests and tokens of every day kept, by day, by model and by plan', async () => {
    const [days, usage] = await Promise.all([rows('days'), rows('usage')]);
    const byDate = new Map<string, Row[]>();
    for (const u of usage) byDate.set(u.date, [...(byDate.get(u.date) ?? []), u]);
    expect(days.length).toBeGreaterThan(0);
    for (const d of days) {
      const models = byDate.get(d.date) ?? [];
      expect(models.map((u) => u.model).sort(), d.date).toEqual(['meridian-embed', 'meridian-large', 'meridian-swift', 'none']);
      expect(sum(models.map((u) => cents(u.revenue))), `${d.date} revenue by model`).toBe(cents(d.revenue));
      expect(sum(Object.values(d.revenueByPlan as Record<string, number>).map(cents)), `${d.date} revenue by plan`).toBe(cents(d.revenue));
      expect(Object.keys(d.revenueByPlan).sort(), d.date).toEqual(['Enterprise', 'Scale', 'Starter']);
      expect(sum(models.map((u) => u.requests)), `${d.date} requests by model`).toBe(d.requests);
      expect(sum(models.map((u) => u.inputTokens + u.outputTokens)), `${d.date} tokens by model`).toBe(d.tokens);
      expect(sum(models.map((u) => u.errors)), `${d.date} errors by model`).toBe(d.errors);
    }
  });

  it('says the same revenue of the last 30 complete days by day and by customer, to the cent', async () => {
    const [days, customers] = await Promise.all([rows('days'), rows('customers')]);
    const month = days.filter((d) => LAST_30.has(d.date));
    expect(month).toHaveLength(30);
    expect(sum(customers.filter(kept).map((c) => cents(c.revenue)))).toBe(sum(month.map((d) => cents(d.revenue))));
    for (const plan of ['Enterprise', 'Scale', 'Starter']) {
      expect(sum(customers.filter((c) => kept(c) && c.plan === plan).map((c) => cents(c.revenue))), plan).toBe(sum(month.map((d) => cents(d.revenueByPlan[plan]))));
    }
  });

  it('counts the same requests of the last 30 complete days by day, customer, endpoint, region and status class', async () => {
    const [days, customers, endpoints, regions, responses] = await Promise.all([rows('days'), rows('customers'), rows('endpoints'), rows('regions'), rows('responses')]);
    const total = sum(days.filter((d) => LAST_30.has(d.date)).map((d) => d.requests));
    expect(sum(customers.filter(kept).map((c) => c.requests)), 'by customer').toBe(total);
    expect(sum(endpoints.map((e) => e.requests)), 'by endpoint').toBe(total);
    expect(sum(regions.map((r) => r.value)), 'by region').toBe(total);
    expect(sum(responses.map((r) => r.value)), 'by status class').toBe(total);
    expect(endpoints.map((e) => e.route).sort()).toEqual(ROUTES);
    expect(regions.map((r) => r.label).sort()).toEqual(REGIONS);
    for (const c of customers.filter(kept)) {
      expect(Object.keys(c.byEndpoint).every((route) => ROUTES.includes(route)), `${c.name}: routes`).toBe(true);
      expect(sum(Object.values(c.byEndpoint as Record<string, number>)), `${c.name}: requests by endpoint`).toBe(c.requests);
    }
  });

  it('counts the same requests by weekday and hour, sends each model the requests of the route it serves, and counts no more server errors than errors', async () => {
    const [days, usage, endpoints, responses, hours] = await Promise.all([rows('days'), rows('usage'), rows('endpoints'), rows('responses'), rows('hours')]);
    const month = days.filter((d) => LAST_30.has(d.date));
    const total = sum(month.map((d) => d.requests));
    expect(hours).toHaveLength(7 * 24);
    expect(sum(hours.map((h) => h.requests)), 'by weekday and hour').toBe(total);
    const sent = (...models: string[]) => sum(usage.filter((u) => LAST_30.has(u.date) && models.includes(u.model)).map((u) => u.requests));
    const route = (r: string) => endpoints.find((e) => e.route === r)!.requests;
    expect(route('/v1/messages'), 'the two models that serve /v1/messages').toBe(sent('meridian-large', 'meridian-swift'));
    expect(route('/v1/embeddings'), 'the model that serves /v1/embeddings').toBe(sent('meridian-embed'));
    expect(total - route('/v1/messages') - route('/v1/embeddings'), 'every other route reaches no model').toBe(sent('none'));
    const of = (label: string) => responses.find((r) => r.label === label)!.value;
    const errors = sum(month.map((d) => d.errors));
    expect(of('5xx') <= errors && errors <= of('5xx') + of('4xx'), `${errors} errors (5xx and 429) against ${of('5xx')} 5xx and ${of('4xx')} 4xx`).toBe(true);
  });

  it('counts a customer that has left in nothing', async () => {
    const left = (await rows('customers')).filter((c) => !kept(c));
    expect(left).toHaveLength(9);
    for (const c of left) {
      expect(c.left, c.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.left >= back(360) && c.left < back(30), `${c.name} left on ${c.left}: inside the year, before the 30 days its figures cover`).toBe(true);
      expect([c.revenue, c.requests, c.tokens], c.name).toEqual([0, 0, 0]);
    }
    const all = await rows('customers');
    const figures = customerFigures(all as never);
    expect(figures.customers, 'the customers a page counts').toBe(320);
    expect(cents(figures.revenue), 'the revenue a page sums').toBe(sum(all.filter(kept).map((c) => cents(c.revenue))));
  });
});

describe('the company is the size the spec froze', () => {
  it('keeps 360 complete days, the last of them the day before its clock', async () => {
    expect(clock().toISOString()).toBe('2026-10-03T09:00:00.000Z');
    const complete = (await rows('days')).map((d) => d.date).filter((date) => date !== today).sort();
    expect(complete).toEqual(span(360));
    expect([complete[0], complete[359]]).toEqual(['2025-10-08', '2026-10-02']);
  });

  it('has 320 customers that have not left, on three plans and in three states, the twelve of release 0.15.0 among them', async () => {
    const customers = (await rows('customers')).filter(kept);
    const count = (field: string) => customers.reduce<Record<string, number>>((n, c) => ({ ...n, [c[field]]: (n[c[field]] ?? 0) + 1 }), {});
    expect(customers).toHaveLength(320);
    expect(count('plan')).toEqual({ Enterprise: 24, Scale: 82, Starter: 214 });
    expect(count('status')).toEqual({ active: 296, trial: 14, 'past due': 10 });
    const names = (await rows('customers')).map((c) => c.name);
    expect(new Set(names).size, 'no name repeats').toBe(names.length);
    for (const name of NAMES_OF_0_15) expect(customers.map((c) => c.name), name).toContain(name);
    const of = (name: string) => customers.find((c) => c.name === name)!;
    expect(of('Lumen Studio').status).toBe('past due');
    expect(of('Brightline').status).toBe('trial');
    expect([...customers].sort((a, b) => b.revenue - a.revenue)[0].name).toBe('Northwind Labs');
    const members = (await rows('members')).map((m) => m.name);
    for (const c of customers) expect(members, `${c.name} is owned by a member`).toContain(c.owner);
    for (const c of customers) {
      expect(c.trialEnds !== null, `${c.name}: a trial has the date it ends, and nothing else has`).toBe(c.status === 'trial');
      expect(c.pastDueSince !== null, `${c.name}: a customer past due has the date since, and nothing else has`).toBe(c.status === 'past due');
      expect(c.previousPlan !== null, `${c.name}: a plan it moved from goes with the date it moved`).toBe(c.planSince !== null);
    }
    expect(customers.some((c) => c.previousPlan !== null), 'some customer has changed plan').toBe(true);
  });

  it('provisions GPUs in four regions, stepping up from 360 to 690, at 2.50 dollars a GPU-hour', async () => {
    const [compute, costs] = await Promise.all([rows('compute'), rows('costs')]);
    const complete = span(360);
    const gpus = (date: string) => sum(compute.filter((r) => r.date === date).map((r) => r.gpus));
    expect(compute.filter((r) => r.date === complete[0]).map((r) => r.region).sort()).toEqual(REGIONS);
    expect([gpus(complete[0]), gpus(complete[359])]).toEqual([360, 690]);
    const cost = Object.fromEntries(costs.map((c) => [c.date, c.compute]));
    let before = 0;
    for (const date of complete) {
      expect(gpus(date), `${date}: never fewer than the day before`).toBeGreaterThanOrEqual(before);
      before = gpus(date);
      expect(cents(cost[date]), `${date}: what the GPUs provisioned cost`).toBe(cents(gpus(date) * 24 * 2.5));
    }
    for (const r of compute) {
      expect(r.id).toBe(`${r.date}:${r.region}`);
      expect(r.used >= 0 && r.used <= r.gpus * 24, `${r.id}: ${r.used} GPU-hours used of ${r.gpus * 24}`).toBe(true);
    }
  });
});

describe('the sample holds what the pages state', () => {
  it('a run of three records: the latest 30 days are the highest yet for revenue, and so were the two before, and not the one before those', async () => {
    const revenue = Object.fromEntries((await rows('days')).map((d) => [d.date, cents(d.revenue)]));
    const period = Array.from({ length: 12 }, (_, k) => sum(span(30, 30 * k).map((date) => revenue[date])));
    const record = (k: number) => period.slice(k + 1).every((earlier) => earlier < period[k]);
    expect([record(0), record(1), record(2), record(3)]).toEqual([true, true, true, false]);
  });

  it('exactly three complete days outside the band of p95 under 350 ms and errors under 1%', async () => {
    const complete = (await rows('days')).filter((d) => d.date !== today);
    expect(complete.filter((d) => !(d.p95 < 350 && d.errors / d.requests < 0.01)).map((d) => d.date)).toHaveLength(3);
  });

  it('a first day above 25 million requests inside the year, and none above 50 million', async () => {
    const complete = (await rows('days')).filter((d) => d.date !== today).sort((a, b) => a.date.localeCompare(b.date));
    expect(complete[0].requests).toBeLessThan(25_000_000);
    expect(complete.some((d) => d.requests > 25_000_000)).toBe(true);
    expect(Math.max(...complete.map((d) => d.requests))).toBeLessThan(50_000_000);
  });

  it('every Enterprise customer sent more in its last 7 days than in the 7 before, and not every customer did', async () => {
    const customers = (await rows('customers')).filter(kept);
    const grew = (c: Row) => sum((c.trend as number[]).slice(7)) > sum((c.trend as number[]).slice(0, 7));
    for (const c of customers) expect(c.trend, c.name).toHaveLength(14);
    expect(customers.filter((c) => c.plan === 'Enterprise').every(grew)).toBe(true);
    expect(customers.every(grew)).toBe(false);
  });

  it('one hour of the week at least twice the next busiest, late on a Sunday', async () => {
    const hours = [...(await rows('hours'))].sort((a, b) => b.requests - a.requests);
    expect(hours[0].requests).toBeGreaterThanOrEqual(2 * hours[1].requests);
    expect([hours[0].weekday, hours[0].hour >= 20]).toEqual([6, true]);
  });

  it('a largest customer that pays a tenth of the revenue or more', async () => {
    const [days, customers] = await Promise.all([rows('days'), rows('customers')]);
    const month = sum(days.filter((d) => LAST_30.has(d.date)).map((d) => d.revenue));
    expect(Math.max(...customers.map((c) => c.revenue)) / month).toBeGreaterThanOrEqual(0.1);
  });
});

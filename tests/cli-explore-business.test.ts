// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages' prepared queries of the sample's records.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: 'members_1' as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { can, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { readDays } from '@/data/metrics';
import { aggregate, read } from '@/data/read';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { z } from 'zod';
import { customersExplore } from '@/logic/customers-explore';
import { homeExplore } from '@/logic/home-explore';
import { requestExplore } from '@/logic/request-explore';
import { requestsExplore } from '@/logic/requests-explore';
import { revenueExplore } from '@/logic/revenue-explore';
import { usageExplore } from '@/logic/usage-explore';

/**
 * The prepared queries of Home, Revenue, Customers, Requests and One request (FR-38, FR-39), and the figures AC-14.2
 * holds: asked for a figure its page shows, a query gets the page's number, over the same complete days, with the day
 * in progress in no answer, and the window before the same number of days.
 */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => clock().toISOString().slice(0, 10);
const io = (): ExploreIO => ({ aggregate, read: (name, q) => read(name, q), today: today() });
async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}
const ask = async (q: PreparedQuery<never>, input: Record<string, unknown>, page = '/') => (await runExplore(q as PreparedQuery, input, await rights(), io(), page, z.object({}))).answer;
const QUERIES = { home: homeExplore, revenue: revenueExplore, customers: customersExplore, requests: requestsExplore } as Record<string, PreparedQuery<never>>;

beforeEach(() => { jar.value = 'members_1'; });

describe('each prepared query is declared in full and answers within its bounds', () => {
  for (const [name, q] of Object.entries(QUERIES)) {
    it(`${name}: at most five sources, each with measures and a drill that names its rows' addresses, and every answer within 3,000 characters`, async () => {
      const sources = Object.entries(q.sources);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.length).toBeLessThanOrEqual(5);
      expect(JSON.stringify(z.toJSONSchema(exploreSchema(q as PreparedQuery, await rights()))).length).toBeLessThanOrEqual(6000);
      for (const [source, s] of sources) {
        const key = collections.find((c) => c.name === s.collection)!.key;
        expect(s.drill.columns, `${name}.${source}'s drill names the key`).toContain(key);
        const first = Object.keys(s.measures)[0];
        const answer = await ask(q, { source, measures: [first], rows: 20 });
        expect(answer.length, `${name}.${source}`).toBeLessThanOrEqual(3000);
        const drilled = answer.split('\n').filter((l) => /^- \/\S*: /.test(l));
        expect(drilled.length, `${name}.${source} drills with addresses`).toBeGreaterThan(0);
        expect(drilled.length).toBeLessThanOrEqual(20);
      }
    });
  }

  it("One request: its route's sampled requests, fixed by the page's id, and an id that is no request refused", async () => {
    const { rows } = await read('requests', { limit: 1 });
    const r = rows[0] as { id: string; route: string };
    const q = requestExplore as unknown as PreparedQuery<never>;
    const [source] = Object.keys(q.sources);
    const answer = (await runExplore(q as PreparedQuery, { id: r.id, source, measures: [Object.keys(q.sources[source].measures)[0]] }, await rights(), io(), `/requests/${r.id}`, z.object({ id: z.string() }))).answer;
    expect(answer).toContain(r.route);
    expect(answer).toMatch(/sample/i);
    await expect(runExplore(q as PreparedQuery, { id: 'no-such-request', source, measures: [Object.keys(q.sources[source].measures)[0]] }, await rights(), io(), '/requests/x', z.object({ id: z.string() }))).rejects.toThrow();
  });

  it('Requests: the sampled log has no window, and its answers say they are of the sample', async () => {
    const schema = JSON.stringify(z.toJSONSchema(exploreSchema(requestsExplore as PreparedQuery, await rights())));
    expect(schema).not.toContain('"period"');
    const answer = await ask(QUERIES.requests, { source: 'requests', measures: [Object.keys(requestsExplore.sources.requests.measures)[0]], by: 'statusClass' });
    expect(answer).toMatch(/sample/i);
  });
});

describe("asked for a figure its page shows, a prepared query gets the page's number (AC-14.2)", () => {
  it('Home: revenue in the last 30 complete days, and the 30 before', async () => {
    const { totals } = await readDays('30d');
    const answer = await ask(QUERIES.home, { source: 'days', measures: ['revenue'], period: '30d', compare: true });
    expect(answer).toContain(fmt(totals.current.revenue));
    expect(answer).toContain(fmt(totals.previous!.revenue));
    expect(answer).not.toContain(today());
  });

  it('Revenue: revenue by plan in the last 30 complete days, and the 30 before', async () => {
    const { series, previous } = await readDays('30d');
    const answer = await ask(QUERIES.revenue, { source: 'days', measures: ['enterprise', 'scale', 'starter'], period: '30d', compare: true });
    for (const plan of ['Enterprise', 'Scale', 'Starter'] as const) {
      expect(answer, plan).toContain(fmt(series.reduce((a, d) => a + d.revenueByPlan[plan], 0)));
      expect(answer, `${plan}, the 30 before`).toContain(fmt(previous.reduce((a, d) => a + d.revenueByPlan[plan], 0)));
    }
  });

  it('Usage: requests in the last 30 complete days, and the 30 before', async () => {
    const { totals } = await readDays('30d');
    const answer = await ask(usageExplore as unknown as PreparedQuery<never>, { source: 'days', measures: ['requests'], period: '30d', compare: true });
    expect(answer).toContain(fmt(totals.current.requests));
    expect(answer).toContain(fmt(totals.previous!.requests));
  });
});

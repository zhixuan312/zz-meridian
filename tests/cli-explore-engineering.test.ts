// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages' prepared queries of the sample's records.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: 'members_1' as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { facts } from '@/app.config';
import { can, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { readDays } from '@/data/metrics';
import { aggregate, read, readAll } from '@/data/read';
import { steady } from '@/lib/facts';
import { exploreSchema, runExplore, type ExploreIO, type ExploreRights, type PreparedQuery } from '@/lib/explore';
import { z } from 'zod';
import { keysExplore } from '@/logic/keys-explore';
import { membersExplore } from '@/logic/members-explore';
import { nowExplore } from '@/logic/now-explore';
import { releasesExplore } from '@/logic/releases-explore';
import { servicesExplore } from '@/logic/services-explore';
import { ticketsExplore } from '@/logic/tickets-explore';

/**
 * The prepared queries of Now, Services, Tickets, Releases, Members and API keys (FR-38, FR-39, FR-40), the fields the
 * data layer derives for them, and the figures AC-14.2 holds for Now and Services.
 */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const io = (): ExploreIO => ({ aggregate, read: (name, q) => read(name, q), today: clock().toISOString().slice(0, 10) });
async function rights(): Promise<ExploreRights> {
  const scope = await resolveAccess();
  const readable = new Set<string>();
  for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
  return { readable, hidden: (name) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
}
const ask = async (q: PreparedQuery<never>, input: Record<string, unknown>) => (await runExplore(q as PreparedQuery, input, await rights(), io(), '/', z.object({}))).answer;
const QUERIES = { now: nowExplore, services: servicesExplore, tickets: ticketsExplore, releases: releasesExplore, members: membersExplore, keys: keysExplore } as Record<string, PreparedQuery<never>>;

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
        const answer = await ask(q, { source, measures: [Object.keys(s.measures)[0]], rows: 20 });
        expect(answer.length, `${name}.${source}`).toBeLessThanOrEqual(3000);
        const drilled = answer.split('\n').filter((l) => /^- \/\S*: /.test(l));
        expect(drilled.length, `${name}.${source} drills with addresses`).toBeGreaterThan(0);
        expect(drilled.length).toBeLessThanOrEqual(20);
      }
    });
  }

  it("Members: a drilled member's line opens with its id and its name, which a write tool's ids come from", async () => {
    const answer = await ask(QUERIES.members, { source: 'members', measures: [Object.keys(membersExplore.sources.members.measures)[0]], where: [{ field: 'status', op: 'eq', value: 'Active' }], rows: 5 });
    const drilled = answer.split('\n').filter((l) => /^- \/\S*: /.test(l));
    expect(drilled.length).toBeGreaterThan(0);
    for (const l of drilled) expect(l).toMatch(/^- \/\S*: id members_\d+, name [^,]+/);
  });

  it("API keys: a key's secret is in no source's filters, facets, measures or drill", () => {
    const named = JSON.stringify(Object.values(keysExplore.sources).map((s) => ({ f: s.filters, g: s.facets, m: s.measures, d: s.drill.columns })));
    expect(named).not.toContain('secretHash');
  });
});

describe('the fields the data layer derives for the prepared queries', () => {
  it('a day is inside the band by the rule the steady fact counts, and a service carries its uptime as a percentage', async () => {
    for (const d of (await readAll('days')).rows as { p95: number; errors: number; requests: number; inBand: boolean; date: string }[]) {
      expect(d.inBand, d.date).toBe(d.p95 < facts.band.p95Under && d.errors / d.requests < facts.band.errorRateUnder);
    }
    for (const s of (await readAll('services')).rows as { name: string; uptime: number; uptimePercent: number }[]) expect(s.uptimePercent, s.name).toBeCloseTo(s.uptime * 100, 9);
  });
});

describe("asked for a figure its page shows, a prepared query gets the page's number (AC-14.2)", () => {
  it('Now: the days inside the band of every complete day kept', async () => {
    const { series } = await readDays('all');
    const held = steady(series, facts.band)!;
    const answer = await ask(QUERIES.now, { source: 'days', measures: ['inside'], period: 'all' });
    expect(answer).toMatch(new RegExp(`\\b${fmt(held.inside)} days\\b`));
    expect(held.of).toBe(series.length);
  });

  it('Services: uptime over 90 days, the mean the title states', async () => {
    const rows = (await readAll('services')).rows as { uptime: number }[];
    const mean = (rows.reduce((a, s) => a + s.uptime, 0) / rows.length) * 100;
    const answer = await ask(QUERIES.services, { source: 'services', measures: ['uptime'] });
    expect(answer).toContain(`${fmt(mean)} %`);
  });
});

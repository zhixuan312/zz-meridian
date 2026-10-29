// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages' prepared queries of the sample's records.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: 'members_1' as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { facts } from '@/app.config';
import { readDays } from '@/data/metrics';
import { readAll } from '@/data/read';
import { steady } from '@/lib/facts';
import { type PreparedQuery } from '@/lib/explore';
import { keysExplore } from '@/logic/keys-explore';
import { membersExplore } from '@/logic/members-explore';
import { nowExplore } from '@/logic/now-explore';
import { releasesExplore } from '@/logic/releases-explore';
import { servicesExplore } from '@/logic/services-explore';
import { ticketsExplore } from '@/logic/tickets-explore';
import { ask, holdsItsBounds } from './cli-explore-kit';

/**
 * The prepared queries of Now, Services, Tickets, Releases, Members and API keys (FR-38, FR-39, FR-40), the fields the
 * data layer derives for them, and the figures AC-14.2 holds for Now and Services.
 */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const QUERIES = { now: nowExplore, services: servicesExplore, tickets: ticketsExplore, releases: releasesExplore, members: membersExplore, keys: keysExplore } as Record<string, PreparedQuery<never>>;

beforeEach(() => { jar.value = 'members_1'; });

describe('each prepared query is declared in full and answers within its bounds', () => {
  holdsItsBounds(QUERIES);

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

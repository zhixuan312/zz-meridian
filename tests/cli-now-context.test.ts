// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own page, which a product replaces.
import { describe, expect, it } from 'vitest';
import type { Incident } from '@/components/patterns/incident-card';
import { verificationOf } from '@/data/verification';
import { contextText } from '@/lib/shared-context';
import { ACTIVITY, DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, MODELS, SERVICES, type IncidentRecord } from '@/system/fixtures/sample';
import { COMPUTE, ENDPOINTS, USAGE, demoSeries } from '@/system/fixtures/company';
import { RELEASES, RUNS, TICKETS } from '@/system/fixtures/sample-engineering';
import { MEMBERS } from '@/system/fixtures/sample-members';
import { PAST_INCIDENTS } from '@/system/fixtures/sample-ops';
import { nowContext } from '@/views/now-context';
import { nowData, type NowReads } from '@/views/now-parts';

const BUDGET = 2600;
// As a page is handed them: the record without the id of its ticket, the ticket joined by its title.
const handed = ({ owner, ticketId, ...incident }: IncidentRecord): Incident => {
  const ticket = TICKETS.find((t) => t.id === ticketId);
  return { ...incident, ...(owner ? { owner } : {}), ...(ticket ? { ticket: { title: ticket.title, href: `/operations-tickets?q=${encodeURIComponent(ticket.title)}` } } : {}) };
};
const EVERY = [...INCIDENTS, ...PAST_INCIDENTS.slice(1)].map(handed).sort((a, b) => (a.started < b.started ? 1 : -1));
const reads = (over: Partial<NowReads> = {}): NowReads => ({
  services: SERVICES, incidents: EVERY,
  releases: RELEASES.map((r) => ({ ...r, verification: verificationOf(r, RUNS) })),
  runs: RUNS.map((r) => ({ ...r, release: null })),
  history: demoSeries('all').current, usage: USAGE, models: MODELS, compute: COMPUTE, endpoints: ENDPOINTS,
  tickets: TICKETS.map((t) => ({ ...t, assignee: MEMBERS.find((m) => m.id === t.assigneeId)?.name ?? null })),
  activity: ACTIVITY, reader: 'members_1', updatedAt: DEMO_UPDATED_AT.toISOString(), now: DEMO_NOW.toISOString(), ...over,
});

describe("Now's context", () => {
  it('names its address, the services as their summary and the open incident with its owner and its ticket', () => {
    const data = nowData(reads());
    const c = nowContext(data);
    const text = contextText(c);
    expect(c.address).toBe('/engineering');
    expect(c.facts[0]).toEqual({ label: 'Services now', value: '1 service degraded (Inference API degraded)' });
    expect(c.facts.map((f) => f.label)).toEqual(['Services now', 'Models, last 30 complete days', 'Compute in use, 02 Oct 2026', 'Shipping', 'Work', 'Slowest endpoints, p95 over 30 days', 'The last 30 complete days', 'Changes']);
    expect(text).toContain(`Open incident "${INCIDENTS[0].title}" on Inference API, minor, monitoring, with Jonas Weber, tracked in "${TICKETS[0].title}"`);
  });

  it('fits the budget every context is held to', () => {
    expect(contextText(nowContext(nowData(reads()))).length).toBeLessThanOrEqual(BUDGET);
  });

  it('leads with the title and the days inside the band, and says when none is open when the last one was resolved', () => {
    const data = nowData(reads({ incidents: EVERY.filter((i) => i.state === 'resolved') }));
    const c = nowContext(data);
    // The title and the days inside the band lead every context of the page.
    expect(c.insights.slice(0, 3).map((i) => i.text)).toEqual([data.head.title, `Steady: ${data.head.facts[0].text}.`, 'No incident is open; the last was resolved on 17 Aug 2026 and lasted 2.4h.']);
  });

  it('states every open incident, the most severe first', () => {
    const started = new Date(DEMO_NOW.getTime() - 40 * 60_000).toISOString();
    const major: Incident = { id: 'inc_2611', title: 'Files uploads fail in us-west-2', service: 'Files', severity: 'major', state: 'investigating', started, updates: [{ at: started, text: 'Uploads over 10 MB fail.' }] };
    const text = contextText(nowContext(nowData(reads({ incidents: [major, ...EVERY] }))));
    expect(text.indexOf('Open incident "Files uploads fail in us-west-2"')).toBeGreaterThan(-1);
    expect(text.indexOf('Open incident "Files uploads fail in us-west-2"')).toBeLessThan(text.indexOf(`Open incident "${INCIDENTS[0].title}"`));
  });

  it('says what it could not read, and counts the day in progress in nothing but the runs a day', () => {
    const c = nowContext(nowData(reads({ tickets: null, compute: null })));
    expect(c.unknowns).toContain('The compute could not be read, so compute in use is not stated.');
    expect(c.unknowns).toContain('The tickets could not be read, so the work and the tickets closed are not stated.');
    expect(c.unknowns).toContain('03 Oct 2026 is in progress and counted in no figure but the runs a day.');
    expect(c.facts.map((f) => f.label)).not.toContain('Work');
  });
});

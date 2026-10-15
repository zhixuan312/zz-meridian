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
  it('says a model with no row in the window was not measured, rather than 0ms and 0.00%', () => {
    const models = [...MODELS, { ...MODELS[0], id: 'meridian_unused', label: 'Meridian Unused' }];
    const data = nowData(reads({ models }));
    const row = data.models!.find((m) => m.id === 'meridian_unused')!;
    // Nobody used it, so it answered no requests: that really is none. But no latency and no error share were measured,
    // and 0ms and 0.00% are claims nobody took — the same defect the request log had.
    expect(row.requests).toBe(0);
    expect(row.p95).toBeNull();
    expect(row.errorRate).toBeNull();
    expect(row.ttft).toBeNull();
    expect(contextText(nowContext(data))).not.toMatch(/NaN|Infinity/);
  });
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

  it('states the most severe open incident in full, and counts the rest', () => {
    const started = new Date(DEMO_NOW.getTime() - 40 * 60_000).toISOString();
    const major: Incident = { id: 'inc_2611', title: 'Files uploads fail in us-west-2', service: 'Files', severity: 'major', state: 'investigating', started, updates: [{ at: started, text: 'Uploads over 10 MB fail.' }] };
    const text = contextText(nowContext(nowData(reads({ incidents: [major, ...EVERY] }))));
    expect(text).toContain('Open incident "Files uploads fail in us-west-2" on Files, major, investigating: started 40 min ago; latest update 40 min ago.');
    expect(text).not.toContain(`Open incident "${INCIDENTS[0].title}"`);
    expect(text).toContain('And 1 more incident open, 2 in all.');
  });

  it('names the first of each list in the page\'s order, and counts the rest', () => {
    // Four times the releases, the services and the models: each list states its first and says how many more there are.
    const times = <T extends object>(rows: readonly T[], k: number, copy: (row: T, i: number) => Partial<T>) =>
      rows.flatMap((row) => Array.from({ length: k }, (_, i) => (i ? { ...row, ...copy(row, i) } : row)));
    // Each copy of a release has the runs of the release it copies, so it stands where that one stands.
    const releases = times(RELEASES, 4, (r, i) => ({ id: `${r.id}_${i}`, version: `${r.version}-${i}` }))
      .map((r) => ({ ...r, verification: verificationOf(r, RUNS.map((x) => (x.releaseId === r.id.replace(/_\d$/, '') ? { ...x, releaseId: r.id } : x))) }));
    const services = times(SERVICES, 4, (s, i) => ({ name: `${s.name} ${i + 1}` }));
    const models = times(MODELS, 2, (m, i) => ({ id: `${m.id}_${i}`, label: `${m.label} ${i + 1}` }));
    const data = nowData(reads({ releases, services, models }));
    const c = nowContext(data);
    const value = (label: string) => c.facts.find((f) => f.label.startsWith(label))!.value;
    const { testing, ready } = data.shipping!;
    expect(value('Shipping')).toContain(`${testing.slice(0, 3).map((r) => `${r.version} (${r.service})`).join(', ')} and ${testing.length - 3} more in testing`);
    expect(value('Shipping')).toContain(`${ready.slice(0, 3).map((r) => `${r.version} (${r.service})`).join(', ')} and ${ready.length - 3} more ready`);
    const unwell = data.services.filter((s) => s.status !== 'operational');
    expect(value('Services now')).toBe(`${unwell.length} services degraded (${unwell[0].name} degraded, and ${unwell.length - 1} more)`);
    expect(value('Models')).toMatch(new RegExp(`^${data.models![0].label} [^;]+(; [^;]+){3}; and ${data.models!.length - 4} more models$`));
    expect(contextText(c).length).toBeLessThanOrEqual(BUDGET);
  });

  it('says what it could not read, and counts the day in progress in nothing but the runs a day', () => {
    const c = nowContext(nowData(reads({ tickets: null, compute: null })));
    expect(c.unknowns).toContain('The compute could not be read, so compute in use is not stated.');
    expect(c.unknowns).toContain('The tickets could not be read, so the work and the tickets closed are not stated.');
    expect(c.unknowns).toContain('3 Oct is in progress and counted in no figure but the runs a day.');
    expect(c.facts.map((f) => f.label)).not.toContain('Work');
  });
});

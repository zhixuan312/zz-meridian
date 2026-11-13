// @vitest-environment node
// Named cli-* so the payload leaves it out: it holds the sample's own figures, which a product replaces.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const fail = vi.hoisted(() => ({ names: new Set<string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
// A collection named in `fail` cannot be read: every read of the product goes through these two functions.
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  const refuse = (name: string) => { if (fail.names.has(name)) throw new Error(`${name} is unavailable`); };
  return {
    ...real,
    read: async (name: string, q?: unknown) => { refuse(name); return real.read(name, q as never); },
    readAll: async (name: string, q?: unknown) => { refuse(name); return real.readAll(name, q as never); },
  };
});

import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { contextText } from '@/lib/shared-context';
import { INCIDENTS } from '@/system/fixtures/sample';
import { TICKETS } from '@/system/fixtures/sample-engineering';
import { nowTool } from '@/logic/tools';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', viewer: 'members_12' };
/** The pattern for a ticket's title, which carries punctuation of its own. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

beforeEach(() => { jar.value = undefined; fail.names.clear(); });

/** Now's read as one person, and its context as text. */
const as = async (id: string) => { jar.value = id; return nowTool.read({}); };
const said = async (id = PERSONAS.owner) => contextText((await as(id)).context);

describe('what Now is handed from the product', () => {
  it("opens the open incident's ticket after the incident began", () => {
    const incident = INCIDENTS.find((i) => i.state !== 'resolved' && i.ticketId)!;
    const ticket = TICKETS.find((t) => t.id === incident.ticketId)!;
    expect(ticket.incidentId).toBe(incident.id);
    expect(Date.parse(ticket.openedAt)).toBeGreaterThanOrEqual(Date.parse(incident.started));
  });
});

describe("Now's context states engineering as it is", () => {
  // Its budget, for every person, is held in tests/cli-context-budget.test.ts.
  it('names its address for every person', async () => {
    for (const [who, id] of Object.entries(PERSONAS)) {
      const { context } = await as(id);
      expect(context.address, who).toBe('/engineering');
    }
  });

  it('the open incident with its owner and its ticket, and the days inside the band with the four facts about them', async () => {
    const { context, data } = await as(PERSONAS.owner);
    const text = contextText(context);
    const incident = INCIDENTS.find((i) => i.state !== 'resolved')!;
    const ticket = TICKETS.find((t) => t.id === incident.ticketId)!;
    for (const s of [incident.service, incident.owner!, ticket.title]) expect(text, s).toContain(s);
    expect(text).toContain(`${data.band!.inside} of ${data.band!.of} days`);
    // The four facts of the band: the days outside it by date, in the steady line that heads the page, then the year,
    // p95 on the busiest day yet, and the share answered without an error.
    expect(text).toContain(data.head.facts[0]!.text);
    for (const fact of data.band!.facts.filter((f) => f.about !== 'outside')) expect(text, fact.text).toContain(fact.text);
  });

  it("each model's requests and p95 of the median day over the last 30 complete days", async () => {
    const { data } = await as(PERSONAS.owner);
    const text = await said();
    for (const model of data.models!) {
      expect(text, model.label).toContain(`${model.label} ${formatCompact(model.requests)} requests, p95 ${formatDuration(model.p95)}`);
    }
  });

  it('compute in use a region on the latest complete day, the fullest named with its GPUs', async () => {
    const { data } = await as(PERSONAS.owner);
    const text = contextText((await as(PERSONAS.owner)).context);
    const compute = data.compute!;
    const fullest = compute.regions.find((r) => r.region === compute.fullest) ?? compute.regions[0]!;
    expect(text).toContain(`${fullest.region} ${formatPercent(fullest.share, 1)} of ${fullest.gpus} GPUs`);
    expect(text).toContain(formatDate(compute.day));
  });

  it('what ships: the releases in testing with what holds each, the one ready, the live versions and the required checks counted', async () => {
    const { data } = await as(PERSONAS.owner);
    const text = contextText((await as(PERSONAS.owner)).context);
    const shipping = data.shipping!;
    for (const release of [...shipping.testing, ...shipping.ready]) expect(text, release.version).toContain(release.version);
    expect(text).toContain(`${shipping.checks.passed} of ${shipping.checks.required} required checks passed`);
    expect(text).toContain(`${shipping.live.length} version`);
  });

  it("the work, high priority first, then what nobody owns, and the reader's own marked", async () => {
    const { context, data } = await as(PERSONAS.owner);
    const text = contextText(context);
    const asked = data.work!.tickets.filter((t) => t.priority === 'high' || !t.owner);
    const high = asked.find((t) => t.priority === 'high')!;
    const unowned = asked.find((t) => !t.owner && t.priority !== 'high')!;
    expect(text.indexOf(high.title)).toBeGreaterThan(-1);
    expect(text.indexOf(unowned.title)).toBeGreaterThan(text.indexOf(high.title));
    const own = asked.find((t) => t.mine)!;
    expect(text).toMatch(new RegExp(`${escape(own.title)}[^\\n]*yours`, 'i'));
    // Someone else reads the same list with nothing marked as theirs.
    expect(await said(PERSONAS.viewer)).not.toMatch(new RegExp(`${escape(own.title)}[^\\n]*yours`, 'i'));
  });

  it('the slowest endpoint by p95 first', async () => {
    const { context, data } = await as(PERSONAS.owner);
    const slowest = [...data.endpoints!].sort((a, b) => b.p95 - a.p95)[0]!;
    const fact = context.facts.find((f) => /slowest endpoints/i.test(f.label))!;
    expect(fact.value).toContain(`${slowest.method} ${slowest.route} ${formatDuration(slowest.p95)}`);
  });

  it('the last 30 complete days: releases out, tickets closed with how long each took, runs passed of all, incidents resolved', async () => {
    const { data } = await as(PERSONAS.owner);
    const text = await said();
    for (const tile of [data.month.releases, data.month.tickets, data.month.runs, data.month.incidents]) {
      if (!tile) continue;
      expect(text, tile.label).toContain(`${tile.label} ${tile.value}${tile.of !== undefined ? ` of ${tile.of}` : ''}, ${tile.line}`);
    }
  });

  it('what changed, newest first', async () => {
    const { data } = await as(PERSONAS.owner);
    const events = (data as unknown as { activity: { at: string }[] | null }).activity!;
    expect(events.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < events.length; i++) expect(events[i - 1].at >= events[i].at).toBe(true);
  });

  it('a read that failed leaves its part unread and says so, and the rest is stated', async () => {
    const band = (await as(PERSONAS.owner)).data.band!;
    const incident = INCIDENTS.find((i) => i.state !== 'resolved')!;
    fail.names.add('tickets');
    const { context } = await as(PERSONAS.owner);
    const text = contextText(context);
    expect(context.unknowns.join(' ')).toMatch(/tickets[^.]*could not be read/i);
    expect(text).toContain(incident.owner!);
    expect(text).toContain(`${band.inside} of ${band.of} days`);
  });
});

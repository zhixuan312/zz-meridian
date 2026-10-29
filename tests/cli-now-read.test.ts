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

import { FEATURES } from '@/data/features';
import { contextText } from '@/lib/shared-context';
import { INCIDENTS } from '@/system/fixtures/sample';
import { TICKETS } from '@/system/fixtures/sample-engineering';
import { nowTool } from '@/logic/tools';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', viewer: 'members_12' };
/** What a view's context may take (tests/shared-context.test.tsx holds every view to it). */

beforeEach(() => { jar.value = undefined; fail.names.clear(); });

/** Now's read as one person, and its context as text. */
const as = async (id: string) => { jar.value = id; return nowTool.read({}); };
const said = async (id = PERSONAS.owner) => contextText((await as(id)).context);

describe('what Now is handed from the product', () => {
  it('needs every collection its parts read, each of which every role that reads the dashboards holds', () => {
    const needs = FEATURES.now.needs as unknown as { allOf: string[] };
    for (const grant of ['services:read', 'incidents:read', 'releases:read', 'tests:read', 'days:read', 'usage:read', 'models:read', 'compute:read', 'endpoints:read', 'tickets:read', 'activity:read']) {
      expect(needs.allOf, grant).toContain(grant);
    }
  });

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
    const text = await said();
    for (const s of ['Inference API', 'Jonas Weber', 'Inference API p95 above target in eu-west-1']) expect(text, s).toContain(s);
    expect(text).toMatch(/357 of 360 days/);
    for (const day of ['17 Aug 2026', '21 Sept 2026', '22 Sept 2026']) expect(text, day).toContain(day);
    // The median day's p95 across the periods beside the growth in requests, p95 on the busiest day yet, and the share
    // answered without an error, each as Home states the same figure.
    expect(text).toMatch(/between 277 and 294 ?ms/);
    expect(text).toMatch(/105\.7%/);
    expect(text).toMatch(/295 ?ms[^\n]*01 Oct 2026|01 Oct 2026[^\n]*295 ?ms/);
    expect(text).toContain('99.62%');
  });

  it("each model's requests and p95 of the median day over the last 30 complete days", async () => {
    const text = await said();
    for (const s of ['Meridian Large', 'Meridian Swift', 'Meridian Embed', 'No model', '826', '471', '236', '419']) expect(text, s).toContain(s);
  });

  it('compute in use a region on the latest complete day, the fullest named with its GPUs', async () => {
    const text = await said();
    expect(text).toMatch(/eu-west-1[^\n]*85\.3%/);
    expect(text).toContain('172');
    expect(text).toContain('02 Oct 2026');
  });

  it('what ships: the releases in testing with what holds each, the one ready, the live versions and the required checks counted', async () => {
    const text = await said();
    for (const v of ['v1.14.0', 'v0.8.3', 'v6.1.0', 'v2.9.0']) expect(text, v).toContain(v);
    expect(text).toMatch(/\d+ of \d+ required (checks|verifications)/);
  });

  it("the work, high priority first, then what nobody owns, and the reader's own marked", async () => {
    const text = await said(PERSONAS.owner);
    const high = text.indexOf('Parser rejects PDFs with an embedded font table');
    const unowned = text.indexOf('Large uploads time out behind the proxy');
    expect(high).toBeGreaterThan(-1);
    expect(unowned).toBeGreaterThan(high);
    expect(text).toMatch(/Parser rejects PDFs with an embedded font table[^\n]*yours/i);
    // Someone else reads the same list with nothing marked as theirs.
    expect(await said(PERSONAS.viewer)).not.toMatch(/Parser rejects PDFs with an embedded font table[^\n]*yours/i);
  });

  it('the slowest endpoint by p95 first', async () => {
    const { context } = await as(PERSONAS.owner);
    const slowest = context.facts.find((f) => /slowest endpoints/i.test(f.label))!;
    expect(slowest.value).toMatch(/^POST \/v1\/files[^;,]*1(\.4s|,?420 ?ms)/);
  });

  it('the last 30 complete days: releases out, tickets closed with how long each took, runs passed of all, incidents resolved', async () => {
    const text = await said();
    expect(text).toMatch(/Releases out[^\n]*\b3\b/);
    expect(text).toMatch(/Tickets closed[^\n]*\b3\b[^\n]*5, 6 and 7 days/);
    expect(text).toMatch(/Runs passed[^\n]*11 of 12/);
    // None was resolved in the window: the last is named with its date and how long it lasted.
    expect(text).toMatch(/Incidents resolved[^\n]*\b0\b[^\n]*17 Aug 2026[^\n]*2\.4 ?h/);
  });

  it('what changed, newest first', async () => {
    const { data } = await as(PERSONAS.owner);
    const events = (data as unknown as { activity: { at: string }[] | null }).activity!;
    expect(events.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < events.length; i++) expect(events[i - 1].at >= events[i].at).toBe(true);
  });

  it('a read that failed leaves its part unread and says so, and the rest is stated', async () => {
    fail.names.add('tickets');
    const { context } = await as(PERSONAS.owner);
    const text = contextText(context);
    expect(context.unknowns.join(' ')).toMatch(/tickets[^.]*could not be read/i);
    expect(text).toContain('Jonas Weber');
    expect(text).toMatch(/357 of 360 days/);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { createTicket, updateTicket } from '../app/(dashboard)/operations-tickets/actions';
import { clock, collections } from '@/data/collections';
import { usageOf, type RequestRow } from '@/data/sample';

/**
 * The records that name each other: an incident its owner and its ticket, a ticket its incident and when it was closed,
 * a request the time to its first token and a price that is the model's, and a service an uptime that agrees with the
 * days it marks.
 */
/** A row of any collection, read as the product stores it. */
type Row = Record<string, any>;
const of = (name: string) => {
  const c = collections.find((x) => x.name === name);
  if (!c) throw new Error(`the product has no collection "${name}"`);
  return c;
};
const rows = async (name: string): Promise<Row[]> => (await of(name).query({})).rows as Row[];
const fields = (name: string) => Object.keys(of(name).fields.shape);
const takes = (name: string, field: string, value: unknown): boolean => of(name).fields.shape[field]?.safeParse(value).success ?? false;
const DAY = 86_400_000;
const today = clock().toISOString().slice(0, 10);
const back = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
const OWNER = 'members_1';

beforeEach(() => { jar.value = OWNER; });

describe('an incident and its ticket', () => {
  it('an incident may name its owner and its ticket, and a ticket its incident and when it was closed', () => {
    for (const field of ['owner', 'ticketId']) { expect(fields('incidents'), field).toContain(field); expect(takes('incidents', field, null), field).toBe(true); }
    for (const field of ['incidentId', 'closedAt']) { expect(fields('tickets'), field).toContain(field); expect(takes('tickets', field, null), field).toBe(true); }
  });

  it('one incident is open with three updates, a member as its owner and a ticket that names it back, and three are resolved', async () => {
    const [incidents, tickets, members] = await Promise.all([rows('incidents'), rows('tickets'), rows('members')]);
    const open = incidents.filter((i) => i.state !== 'resolved');
    expect(open).toHaveLength(1);
    expect(incidents.filter((i) => i.state === 'resolved')).toHaveLength(3);
    expect(open[0].updates).toHaveLength(3);
    expect(members.map((m) => m.name), 'the owner is a member').toContain(open[0].owner);
    expect(tickets.find((t) => t.id === open[0].ticketId)?.incidentId).toBe(open[0].id);
    for (const t of tickets.filter((x) => x.incidentId !== null)) expect(incidents.map((i) => i.id), `${t.id} names an incident the product holds`).toContain(t.incidentId);
  });

  it('a closed ticket says when it was closed, after it was opened, and no other ticket does', async () => {
    const tickets = await rows('tickets');
    expect(tickets.some((t) => t.state === 'closed')).toBe(true);
    for (const t of tickets) {
      if (t.state === 'closed') expect(t.closedAt >= t.openedAt && t.closedAt <= clock().toISOString(), `${t.id} closed at ${t.closedAt}`).toBe(true);
      else expect(t.closedAt, t.id).toBeNull();
    }
  });

  it('closing a ticket records the time, opening it again clears it, and nobody sets either by hand', async () => {
    expect(await createTicket({ title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'high', assigneeId: null, summary: '' })).toEqual({ ok: true });
    const id = String((await rows('tickets')).at(-1)!.id);
    const stored = async () => (await rows('tickets')).find((t) => t.id === id)!;
    expect([(await stored()).closedAt, (await stored()).incidentId]).toEqual([null, null]);
    await updateTicket(id, { closedAt: '2020-01-01T00:00:00.000Z', incidentId: 'inc_2610' } as never);
    expect([(await stored()).closedAt, (await stored()).incidentId], 'a time and an incident sent by a caller are not stored').toEqual([null, null]);
    expect(await updateTicket(id, { state: 'closed' })).toEqual({ ok: true });
    expect((await stored()).closedAt).toBe(clock().toISOString());
    expect(await updateTicket(id, { state: 'open' })).toEqual({ ok: true });
    expect((await stored()).closedAt).toBeNull();
  });
});

describe('a request', () => {
  it('holds the time to its first token where a model answered, and the log says it is a sample', async () => {
    expect(fields('requests')).toContain('ttft');
    expect(takes('requests', 'ttft', null)).toBe(true);
    expect(of('requests').description).toMatch(/\bsample\b/i);
    const requests = await rows('requests');
    expect(requests.some((r) => r.ttft !== null)).toBe(true);
    for (const r of requests) {
      if (r.model === null) expect(r.ttft, `${r.id} reached no model`).toBeNull();
      if (r.ttft !== null) expect(r.ttft > 0 && r.ttft <= r.latency, `${r.id}: first token at ${r.ttft} ms of ${r.latency}`).toBe(true);
    }
  });

  it('is priced at its model\'s price, or at the price of a call when it reached none', async () => {
    const models = Object.fromEntries((await rows('models')).map((m) => [m.id, m]));
    const requests = (await rows('requests')) as RequestRow[];
    let priced = 0;
    for (const r of requests) {
      const { tokens, cost } = usageOf(r);
      if (tokens) {
        const m = models[r.model!];
        expect(cost, `${r.id} on ${r.model}`).toBeCloseTo((tokens.input * m.inputPrice + tokens.output * (m.outputPrice ?? 0)) / 1e6, 12);
        priced++;
      } else expect(cost, r.id).toBe(r.status >= 400 ? 0 : models.none.callPrice);
    }
    expect(priced).toBeGreaterThan(0);
  });
});

describe('a service', () => {
  it('has an uptime under 100% exactly when one of its 90 days carries a mark, and ends its days at its state now', async () => {
    for (const s of await rows('services')) {
      expect(s.days).toHaveLength(90);
      expect(s.days.at(-1), `${s.name}: the last day is the day in progress`).toBe(s.status);
      const marked = (s.days as string[]).some((d) => d !== 'operational');
      expect(s.uptime < 1, `${s.name}: uptime ${s.uptime} with ${marked ? 'a' : 'no'} mark`).toBe(marked);
      expect(s.uptime > 0.9 && s.uptime <= 1, `${s.name}: ${s.uptime}`).toBe(true);
    }
  });

  it('carries a mark on every day the product was outside its band', async () => {
    const [days, services] = await Promise.all([rows('days'), rows('services')]);
    const outside = days.filter((d) => d.date !== today && !(d.p95 < 350 && d.errors / d.requests < 0.01)).map((d) => d.date);
    expect(outside).toHaveLength(3);
    for (let ago = 1; ago < 90; ago++) {
      if (!outside.includes(back(ago))) continue;
      expect(services.some((s) => s.days[89 - ago] !== 'operational'), `${back(ago)} was outside the band, and no service marks it`).toBe(true);
    }
  });
});

// @vitest-environment node
import { asSchema } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { createTicket, updateTicket } from '../app/(dashboard)/operations-tickets/actions';
import { can, collectionFor, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { handedTo } from '@/lib/assistant/scoped';
import { assistantTools } from '@/lib/assistant/tools';
import type { AnyCollection } from '@/lib/collection';
import { ticketsExplore } from '@/logic/tickets-explore';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' };
const draft = { title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'high' as const, assigneeId: null, summary: '' };
const stored = async () => (await collections.find((c) => c.name === 'tickets')!.query({})).rows as Record<string, unknown>[];
/** The write tools of every collection this person may read, each handed as the route hands it; the route then keeps those of the page's prepared query. */
const given = async (id: string) => {
  jar.value = id;
  const scope = await resolveAccess();
  const readable = (await Promise.all(collections.map(async (c) => ((await can(scope, c.name, 'read')) ? handedTo(scope, collectionFor(scope, c.name), c.name) : null)))).filter((c): c is AnyCollection => c !== null);
  const guard = { authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => can(scope, name, op, ids), invalidate: () => {} };
  return assistantTools(readable, { write() {}, merge() {}, onError: undefined } as never, guard as never).tools as Record<string, { inputSchema: never }>;
};
const toolsFor = async (id: string) => Object.keys(await given(id));
const NOW = clock().toISOString();

beforeEach(() => { jar.value = undefined; });

describe('who may write a ticket, by every way in', () => {
  it('is everyone but a Viewer, through the page\'s actions', async () => {
    for (const id of [PERSONAS.owner, PERSONAS.admin, PERSONAS.member, PERSONAS.keyManager]) {
      jar.value = id;
      const before = (await stored()).length;
      expect(await createTicket(draft), id).toEqual({ ok: true });
      const made = String((await stored()).at(-1)!.id);
      expect((await stored()).length, id).toBe(before + 1);
      expect(await updateTicket(made, { state: 'waiting' }), id).toEqual({ ok: true });
    }
    jar.value = PERSONAS.viewer;
    const before = await stored();
    expect((await createTicket(draft)).ok).toBe(false);
    expect((await updateTicket(String(before[0].id), { state: 'closed' })).ok).toBe(false);
    expect(await stored()).toEqual(before);
  });

  it('is everyone but a Viewer, through an assistant\'s tools: a Viewer is given no way to write', async () => {
    for (const id of [PERSONAS.owner, PERSONAS.admin, PERSONAS.member, PERSONAS.keyManager]) {
      expect((await toolsFor(id)).filter((n) => n.endsWith('_tickets')).sort(), id).toEqual(['create_tickets', 'update_tickets']);
    }
    expect((await toolsFor(PERSONAS.viewer)).filter((n) => n.endsWith('_tickets'))).toEqual([]);
  });

  it('is nobody, for a verification run or a release: no persona is given a tool to write one', async () => {
    for (const id of Object.values(PERSONAS)) {
      const names = await toolsFor(id);
      expect(names.filter((n) => n.endsWith('_tests')), id).toEqual([]);
      expect(names.filter((n) => n.endsWith('_releases')), id).toEqual([]);
    }
  });

  it('is refused at the collection itself when a Viewer is handed it anyway', async () => {
    jar.value = PERSONAS.viewer;
    const before = await stored();
    const tickets = collectionFor(await resolveAccess(), 'tickets');
    await expect(Promise.resolve().then(() => tickets.create!(draft))).rejects.toThrow();
    await expect(Promise.resolve().then(() => tickets.update!([String(before[0].id)], { state: 'closed' }))).rejects.toThrow();
    expect(await stored()).toEqual(before);
  });
});

describe('when a ticket was closed, and the incident it tracks', () => {
  it('are read by an agent and asked of none: Tickets\' prepared query drills both, and neither is in a ticket tool\'s create or update schema', async () => {
    const tools = await given(PERSONAS.owner);
    const schemaOf = (name: string) => asSchema(tools[name].inputSchema).jsonSchema as { properties?: Record<string, { properties?: Record<string, unknown> }> };
    const create = Object.keys(schemaOf('create_tickets').properties ?? {});
    const set = Object.keys(schemaOf('update_tickets').properties?.set?.properties ?? {});
    const drilled = Object.values(ticketsExplore.sources).map((s) => s.drill.columns);
    for (const field of ['closedAt', 'incidentId']) {
      expect(create, `create ${field}`).not.toContain(field);
      expect(set, `update ${field}`).not.toContain(field);
      for (const columns of drilled) expect(columns, `drilled ${field}`).toContain(field);
    }
    expect(set).toContain('state');
  });

  it('is each ticket\'s own in a change to several: one the change closes gets the clock\'s time, and one already closed keeps its own', async () => {
    jar.value = PERSONAS.member;
    const tickets = collectionFor(await resolveAccess(), 'tickets');
    // A ticket the sample closed days ago: one closed here would hold the clock's time, and prove nothing.
    const closed = (await stored()).find((t) => t.state === 'closed' && t.closedAt !== NOW)!;
    const open = String((await tickets.create!(draft) as Record<string, unknown>).id);
    const priority = closed.priority === 'low' ? 'normal' : 'low';
    await tickets.update!([String(closed.id), open], { state: 'closed', priority });
    const after = await stored();
    expect(after.find((t) => t.id === closed.id)).toMatchObject({ state: 'closed', priority, closedAt: closed.closedAt, updatedAt: NOW });
    expect(after.find((t) => t.id === open)).toMatchObject({ state: 'closed', priority, closedAt: NOW, updatedAt: NOW });
  });

  it('is cleared for each ticket a change opens again, and stays absent on one that was never closed', async () => {
    jar.value = PERSONAS.member;
    const tickets = collectionFor(await resolveAccess(), 'tickets');
    const [reopened, waiting] = [String((await tickets.create!(draft) as Record<string, unknown>).id), String((await tickets.create!(draft) as Record<string, unknown>).id)];
    await tickets.update!([reopened], { state: 'closed' });
    await tickets.update!([waiting], { state: 'waiting' });
    await tickets.update!([reopened, waiting], { state: 'open' });
    for (const id of [reopened, waiting]) expect((await stored()).find((t) => t.id === id), id).toMatchObject({ state: 'open', closedAt: null, incidentId: null });
  });

  it('is stamped by a move into closed and by nothing else: a change that leaves a closed ticket closed keeps its time', async () => {
    jar.value = PERSONAS.member;
    const tickets = collectionFor(await resolveAccess(), 'tickets');
    const closed = (await stored()).find((t) => t.state === 'closed' && t.closedAt !== NOW)!;
    await tickets.update!([String(closed.id)], { summary: 'Checked again after the release.' });
    expect((await stored()).find((t) => t.id === closed.id)).toMatchObject({ closedAt: closed.closedAt, updatedAt: NOW });
  });

  it('is nobody\'s to set: a change or a new ticket that names either is refused or ignored, and nothing is stored', async () => {
    jar.value = PERSONAS.owner;
    const tickets = collectionFor(await resolveAccess(), 'tickets');
    const made = await tickets.create!({ ...draft, closedAt: '2020-01-01T00:00:00.000Z', incidentId: 'inc_2610' }) as Record<string, unknown>;
    expect([made.closedAt, made.incidentId]).toEqual([null, null]);
    const before = await stored();
    for (const change of [{ closedAt: '2020-01-01T00:00:00.000Z' }, { closedAt: null }, { incidentId: 'inc_2610' }, { state: 'closed', closedAt: '2020-01-01T00:00:00.000Z' }]) {
      await expect(tickets.update!([String(made.id)], change), JSON.stringify(change)).rejects.toThrow(/set by the system/);
    }
    expect(await stored()).toEqual(before);
  });
});

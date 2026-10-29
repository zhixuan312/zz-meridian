// @vitest-environment node
import { asSchema } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { can, collectionFor, resolveAccess } from '@/data/access';
import { clock, collections } from '@/data/collections';
import { assistantTools } from '@/lib/assistant/tools';

type Row = Record<string, unknown>;
type Pair = { suite: string; endpointId: string };
const PEOPLE = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' };
const WRITERS = [PEOPLE.owner, PEOPLE.admin, PEOPLE.member, PEOPLE.keyManager];
const NOW = clock().toISOString();

const raw = (name: string) => collections.find((c) => c.name === name)!;
const all = async (name: string) => (await raw(name).query({})).rows as Row[];
const as = async (id: string) => { jar.value = id; return resolveAccess(); };
/** The tickets as a signed-in person is handed them: what a server action and an agent's tool both write through. */
const ticketsOf = async (id: string) => collectionFor(await as(id), 'tickets');
const draft = { title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'high', assigneeId: PEOPLE.admin, summary: 'It expires on the 14th.' };
const one = async (id: string) => (await all('tickets')).find((t) => t.id === id)!;

beforeEach(() => { jar.value = undefined; });

describe('the three engineering collections', () => {
  it('exist under their names, keyed by id: tickets can be created and changed, verification runs and releases only read', () => {
    for (const name of ['tickets', 'tests', 'releases']) expect(raw(name)?.key, name).toBe('id');
    expect([typeof raw('tickets').create, typeof raw('tickets').update, typeof raw('tickets').remove]).toEqual(['function', 'function', 'undefined']);
    for (const name of ['tests', 'releases']) expect(raw(name).create ?? raw(name).update ?? raw(name).remove, name).toBeUndefined();
  });

  it('are read by every role, and tickets are written by everyone but a Viewer', async () => {
    for (const id of Object.values(PEOPLE)) {
      const scope = await as(id);
      for (const name of ['tickets', 'tests', 'releases']) expect(await can(scope, name, 'read'), `${id} reads ${name}`).toBe(true);
      for (const op of ['create', 'update'] as const) expect(await can(scope, 'tickets', op), `${id} ${op} tickets`).toBe(WRITERS.includes(id));
      expect(await can(scope, 'tickets', 'remove'), `${id} removes tickets`).toBe(false);
      for (const name of ['tests', 'releases']) for (const op of ['create', 'update', 'remove'] as const) expect(await can(scope, name, op), `${id} ${op} ${name}`).toBe(false);
    }
  });
});

describe('the sample the collections hold', () => {
  it('is varied enough to show every state', async () => {
    const [tickets, runs, releases] = await Promise.all([all('tickets'), all('tests'), all('releases')]);
    expect(tickets.length).toBeGreaterThanOrEqual(8);
    expect(new Set(tickets.map((t) => t.state))).toEqual(new Set(['open', 'waiting', 'closed']));
    expect(new Set(tickets.map((t) => t.priority))).toEqual(new Set(['low', 'normal', 'high']));
    expect(tickets.some((t) => t.assigneeId === null)).toBe(true);
    expect(tickets.some((t) => t.state === 'open' && String(t.updatedAt) < NOW)).toBe(true);
    expect(runs.length).toBeGreaterThanOrEqual(12);
    expect(new Set(runs.map((r) => r.state))).toEqual(new Set(['passed', 'failed', 'skipped']));
    expect(releases.length).toBeGreaterThanOrEqual(6);
    expect(new Set(releases.map((r) => r.state))).toEqual(new Set(['testing', 'pending', 'released']));
    expect(new Set(releases.map((r) => r.environment))).toEqual(new Set(['staging', 'production']));
  });

  it('references only records that exist, by the keys the other collections have', async () => {
    const [tickets, runs, releases, services, endpoints, members] = await Promise.all(['tickets', 'tests', 'releases', 'services', 'endpoints', 'members'].map(all));
    const serviceNames = new Set(services.map((s) => s.name));
    const endpointIds = new Set(endpoints.map((e) => e.id));
    const memberIds = new Set(members.map((m) => m.id));
    const releaseIds = new Set(releases.map((r) => r.id));
    for (const t of tickets) {
      expect(serviceNames.has(t.service), `${t.id} service`).toBe(true);
      if (t.assigneeId !== null) expect(memberIds.has(t.assigneeId), `${t.id} assignee`).toBe(true);
    }
    for (const r of runs) {
      expect(endpointIds.has(r.endpointId), `${r.id} endpoint`).toBe(true);
      expect(releaseIds.has(r.releaseId), `${r.id} release`).toBe(true);
    }
    for (const r of releases) {
      expect(serviceNames.has(r.service), `${r.id} service`).toBe(true);
      for (const p of r.requiredVerifications as Pair[]) expect(endpointIds.has(p.endpointId), `${r.id} requires ${p.endpointId}`).toBe(true);
    }
  });

  it('holds no fact later than the clock, and each record keeps its own rules', async () => {
    const [tickets, runs, releases] = await Promise.all([all('tickets'), all('tests'), all('releases')]);
    for (const t of tickets) {
      expect(String(t.openedAt) <= String(t.updatedAt) && String(t.updatedAt) <= NOW, `${t.id} times`).toBe(true);
      expect(String(t.title).trim().length > 0 && String(t.title).length <= 160 && String(t.summary).length <= 4000, `${t.id} text`).toBe(true);
    }
    for (const r of runs) {
      expect(String(r.startedAt) <= NOW, `${r.id} time`).toBe(true);
      expect(Number(r.durationMs), `${r.id} duration`).toBeGreaterThanOrEqual(0);
      if (r.state === 'failed') expect(String(r.failure ?? '').trim().length, `${r.id} says why it failed`).toBeGreaterThan(0);
      else expect(r.failure, `${r.id} has no failure`).toBeNull();
    }
    for (const r of releases) {
      expect(String(r.updatedAt) <= NOW, `${r.id} time`).toBe(true);
      if (r.state === 'released') expect(r.releasedAt !== null && String(r.releasedAt) <= String(r.updatedAt), `${r.id} released`).toBe(true);
      else expect(r.releasedAt, `${r.id} is not released`).toBeNull();
      const pairs = (r.requiredVerifications as Pair[]).map((p) => `${p.suite}|${p.endpointId}`);
      expect(pairs.length, `${r.id} requires something`).toBeGreaterThan(0);
      expect(new Set(pairs).size, `${r.id} requires each pair once`).toBe(pairs.length);
    }
  });

  it('gives every release the state its required verifications say: testing while one is missing, failed or skipped', async () => {
    const [runs, releases] = await Promise.all([all('tests'), all('releases')]);
    // The latest run of a pair: the greatest startedAt, and of two that started together the id that sorts last as text.
    const latest = (releaseId: unknown, p: Pair) => runs
      .filter((r) => r.releaseId === releaseId && r.suite === p.suite && r.endpointId === p.endpointId)
      .sort((a, b) => (String(a.startedAt) === String(b.startedAt) ? (String(a.id) < String(b.id) ? 1 : -1) : String(a.startedAt) < String(b.startedAt) ? 1 : -1))[0];
    for (const r of releases) {
      const resolved = (r.requiredVerifications as Pair[]).every((p) => latest(r.id, p)?.state === 'passed');
      expect(r.state === 'testing', `${r.id} is ${r.state}`).toBe(!resolved);
    }
    // The sample shows both ways to be unresolved, and that an old failure does not hold a release back.
    expect(releases.some((r) => (r.requiredVerifications as Pair[]).some((p) => latest(r.id, p) === undefined))).toBe(true);
    expect(releases.some((r) => r.state !== 'testing' && runs.some((x) => x.releaseId === r.id && x.state === 'failed'))).toBe(true);
  });
});

describe('a ticket written through the boundary', () => {
  it('starts open, trimmed, with the times and the id the server gives it, whatever the caller sends for them', async () => {
    const tickets = await ticketsOf(PEOPLE.member);
    const made = await tickets.create!({ ...draft, title: `  ${draft.title}  `, state: 'closed', openedAt: '2001-01-01T00:00:00.000Z', updatedAt: '2001-01-01T00:00:00.000Z' }) as Row;
    expect(made).toMatchObject({ title: draft.title, service: draft.service, priority: 'high', assigneeId: PEOPLE.admin, summary: draft.summary, state: 'open', openedAt: NOW, updatedAt: NOW });
    expect(String(made.id)).toMatch(/^tickets_\d+$/);
    expect(await one(String(made.id))).toMatchObject({ title: draft.title, state: 'open' });
  });

  it('refuses a title that is empty or too long, a summary that is too long, and a service, an assignee or a priority that does not exist', async () => {
    const tickets = await ticketsOf(PEOPLE.member);
    const before = (await all('tickets')).length;
    for (const bad of [{ title: '   ' }, { title: 'x'.repeat(161) }, { summary: 'x'.repeat(4001) }, { service: 'No such service' }, { assigneeId: 'members_999' }, { priority: 'urgent' }]) {
      await expect(tickets.create!({ ...draft, ...bad }), JSON.stringify(bad).slice(0, 40)).rejects.toThrow();
    }
    expect((await all('tickets')).length).toBe(before);
    expect((await tickets.create!({ ...draft, assigneeId: null }) as Row).assigneeId).toBeNull();
  });

  it('moves between states only along the five allowed steps, and stamps each move', async () => {
    const tickets = await ticketsOf(PEOPLE.admin);
    const id = String((await tickets.create!(draft) as Row).id);
    const move = (state: string) => tickets.update!([id], { state });
    for (const state of ['waiting', 'open', 'closed', 'open', 'waiting', 'closed']) {
      expect((await move(state) as Row[])[0], `to ${state}`).toMatchObject({ id, state, updatedAt: NOW });
    }
    await expect(move('waiting'), 'closed to waiting').rejects.toThrow();
    expect((await one(id)).state).toBe('closed');
    await expect(move('archived'), 'an unknown state').rejects.toThrow();
  });

  it('leaves a ticket exactly as it was when asked for the state it already has, and stamps it when something does change', async () => {
    const old = (await all('tickets')).find((t) => t.state === 'open' && String(t.updatedAt) < NOW)!;
    const tickets = await ticketsOf(PEOPLE.owner);
    await tickets.update!([String(old.id)], { state: 'open' });
    expect(await one(String(old.id))).toEqual(old);
    await tickets.update!([String(old.id)], { priority: old.priority === 'low' ? 'high' : 'low' });
    expect(await one(String(old.id))).toMatchObject({ openedAt: old.openedAt, updatedAt: NOW });
  });

  it('changes the other fields under the same rules, and never the id or the time it was opened', async () => {
    const tickets = await ticketsOf(PEOPLE.member);
    const made = await tickets.create!(draft) as Row;
    const id = String(made.id);
    expect((await tickets.update!([id], { title: '  Renew the certificate  ', priority: 'low', assigneeId: null }) as Row[])[0]).toMatchObject({ title: 'Renew the certificate', priority: 'low', assigneeId: null, openedAt: made.openedAt });
    for (const bad of [{ title: '' }, { service: 'No such service' }, { assigneeId: 'members_999' }, { summary: 'x'.repeat(4001) }]) await expect(tickets.update!([id], bad), JSON.stringify(bad).slice(0, 40)).rejects.toThrow();
    await tickets.update!([id], { openedAt: '2001-01-01T00:00:00.000Z' }).catch(() => {});
    expect((await one(id)).openedAt).toBe(made.openedAt);
  });

  it('changes all the tickets named or none of them, and refuses one that does not exist', async () => {
    const tickets = await ticketsOf(PEOPLE.member);
    const open = String((await tickets.create!(draft) as Row).id);
    const closed = String((await tickets.create!(draft) as Row).id);
    await tickets.update!([closed], { state: 'closed' });
    await expect(tickets.update!([open, closed], { state: 'waiting' })).rejects.toThrow();
    expect((await one(open)).state).toBe('open');
    await expect(tickets.update!(['tickets_999999'], { state: 'closed' })).rejects.toThrow();
  });

  it('tells whoever is listening that tickets changed', async () => {
    let heard = 0;
    const stop = raw('tickets').subscribe!(() => { heard += 1; });
    await (await ticketsOf(PEOPLE.member)).create!(draft);
    stop();
    expect(heard).toBeGreaterThan(0);
  });
});

describe('what an agent is asked when it writes a ticket', () => {
  const guard = { authorize: async () => true, invalidate: () => {} };
  const { tools } = assistantTools(collections, { write() {}, merge() {}, onError: undefined } as never, guard);
  const schemaOf = (name: string) => asSchema((tools as Record<string, { inputSchema: never }>)[name].inputSchema).jsonSchema as { properties?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>; required?: string[] };

  it('never asks an agent for what the server sets: a new ticket\'s state and its two times', () => {
    const create = schemaOf('create_tickets');
    for (const field of ['openedAt', 'updatedAt']) expect(Object.keys(create.properties ?? {}), field).not.toContain(field);
    for (const field of ['state', 'openedAt', 'updatedAt']) expect(create.required ?? [], field).not.toContain(field);
    for (const field of ['title', 'service', 'priority']) expect(create.required ?? [], field).toContain(field);
    const set = schemaOf('update_tickets').properties?.set;
    for (const field of ['openedAt', 'updatedAt']) expect(Object.keys(set?.properties ?? {}), field).not.toContain(field);
    expect(Object.keys(set?.properties ?? {})).toContain('state');
  });
});

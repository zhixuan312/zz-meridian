// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { createTicket, updateTicket } from '../app/(dashboard)/operations-tickets/actions';
import { can, collectionFor, resolveAccess } from '@/data/access';
import { collections } from '@/data/collections';
import { handedTo } from '@/lib/assistant/scoped';
import { assistantTools } from '@/lib/assistant/tools';
import type { AnyCollection } from '@/lib/collection';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' };
const draft = { title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'high' as const, assigneeId: null, summary: '' };
const stored = async () => (await collections.find((c) => c.name === 'tickets')!.query({})).rows as Record<string, unknown>[];
/** The tools an assistant is given for this person: their readable collections, each handed to them as the route hands it. */
const toolsFor = async (id: string) => {
  jar.value = id;
  const scope = await resolveAccess();
  const readable = (await Promise.all(collections.map(async (c) => ((await can(scope, c.name, 'read')) ? handedTo(scope, collectionFor(scope, c.name), c.name) : null)))).filter((c): c is AnyCollection => c !== null);
  const guard = { authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => can(scope, name, op, ids), invalidate: () => {} };
  return Object.keys(assistantTools(readable, { write() {}, merge() {}, onError: undefined } as never, guard as never).tools);
};

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

  it('is everyone but a Viewer, through an assistant\'s tools: a Viewer is given the look-up and no way to write', async () => {
    for (const id of [PERSONAS.owner, PERSONAS.admin, PERSONAS.member, PERSONAS.keyManager]) {
      expect((await toolsFor(id)).filter((n) => n.endsWith('_tickets')).sort(), id).toEqual(['create_tickets', 'query_tickets', 'update_tickets']);
    }
    expect((await toolsFor(PERSONAS.viewer)).filter((n) => n.endsWith('_tickets'))).toEqual(['query_tickets']);
  });

  it('is nobody, for a verification run or a release: every persona is given only the look-up', async () => {
    for (const id of Object.values(PERSONAS)) {
      const names = await toolsFor(id);
      expect(names.filter((n) => n.endsWith('_tests')), id).toEqual(['query_tests']);
      expect(names.filter((n) => n.endsWith('_releases')), id).toEqual(['query_releases']);
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

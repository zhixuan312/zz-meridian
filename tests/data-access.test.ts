// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ updated: [] as string[] }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { cache.updated.push(t); }, revalidateTag: () => {} }));
const session = vi.hoisted(() => ({ scope: null as null | { tenantId: string; subjectId: string; authorizationKey: string } }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => session.scope ?? real.resolveAccess() };
});

import { can, collectionFor, AccessDenied } from '@/data/access';
import { members, requests } from '@/data/collections';
import { assistantTools } from '@/lib/assistant/tools';
import { inviteMember, removeMember, setMemberStatus } from '../app/(dashboard)/members/actions';

const FOREIGN = { tenantId: 'other-tenant', subjectId: 'intruder', authorizationKey: 'other:1' };
const writer = { write() {}, merge() {}, onError: undefined } as never;
type Exec = { execute: (input: unknown, options: unknown) => Promise<unknown> };

const listen = () => { const seen: unknown[] = []; const off = members.subscribe!((e) => seen.push(e)); return { seen, off }; };

beforeEach(() => { cache.updated.length = 0; session.scope = null; });

describe('the real access seam', () => {
  it('has no collection for another tenant, and says the same thing it says for a collection that does not exist', async () => {
    expect(await can(FOREIGN, 'members', 'read')).toBe(false);
    expect(() => collectionFor(FOREIGN, 'members')).toThrow(AccessDenied);
    expect(() => collectionFor(FOREIGN, 'nothing')).toThrow(new AccessDenied().message);
  });
});

describe('a page write from another tenant', () => {
  it('is refused with no mutation, no hint and no invalidation, for every action', async () => {
    session.scope = FOREIGN;
    const before = await members.query({});
    const id = String(before.rows[0].id);
    const l = listen();
    const results = [
      await inviteMember({ name: 'Ana Ruiz', email: 'ana@northwind.example', role: 'Member', team: 'Engineering' }),
      await setMemberStatus(id, 'Suspended'),
      await removeMember(id),
    ];
    for (const r of results) expect(r).toEqual({ ok: false, error: 'You do not have permission to make this change.' });
    const after = await members.query({});
    expect(after.total).toBe(before.total);
    expect(after.rows.find((r) => String(r.id) === id)).toEqual(before.rows[0]);
    expect(cache.updated).toEqual([]);
    expect(l.seen).toEqual([]);
    l.off();
  });
});

describe('a write that throws', () => {
  it('does not invalidate the tenant collection and reports a reason', async () => {
    const spy = vi.spyOn(members, 'update').mockRejectedValueOnce(new Error('The database is unavailable.'));
    const id = String((await members.query({})).rows[0].id);
    const r = await setMemberStatus(id, 'Suspended');
    spy.mockRestore();
    expect(r).toEqual({ ok: false, error: 'The database is unavailable.' });
    expect(cache.updated).toEqual([]);
  });
});

describe('an approved assistant write, asked through the real access seam', () => {
  const guardFor = (scope: typeof FOREIGN, invalidated: string[]) => ({
    authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => can(scope, name, op, ids),
    invalidate: (name: string) => invalidated.push(name),
  });

  it('refuses a record of another tenant: nothing changes, no hint, no invalidation', async () => {
    const invalidated: string[] = [];
    const { tools } = assistantTools([members], writer, guardFor(FOREIGN, invalidated));
    const before = await members.query({});
    const l = listen();
    await expect((tools.remove_members as unknown as Exec).execute({ ids: [String(before.rows[0].id)] }, { toolCallId: 'foreign-remove', messages: [] })).rejects.toThrow(/no longer have permission/);
    expect((await members.query({})).total).toBe(before.total);
    expect(invalidated).toEqual([]);
    expect(l.seen).toEqual([]);
    l.off();
  });

  it('refuses an operation the same tenant may not make on a collection, without touching it', async () => {
    const removed: string[][] = [];
    const readOnly = { ...requests, remove: async (ids: string[]) => { removed.push(ids); return ids.length; } } as typeof requests;
    const invalidated: string[] = [];
    const demo = { tenantId: 'demo', subjectId: 'members_1', authorizationKey: 'demo:members_1:Owner:' };
    const { tools } = assistantTools([readOnly], writer, guardFor(demo, invalidated));
    await expect((tools.remove_requests as unknown as Exec).execute({ ids: ['req_1'] }, { toolCallId: 'same-tenant-remove', messages: [] })).rejects.toThrow(/no longer have permission/);
    expect(removed).toEqual([]);
    expect(invalidated).toEqual([]);
  });
});

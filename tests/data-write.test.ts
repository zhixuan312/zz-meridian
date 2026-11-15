// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ updated: [] as string[], fail: false }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { if (cache.fail) throw new Error('no store'); cache.updated.push(t); }, revalidateTag: () => { if (cache.fail) throw new Error('no store'); } }));
const gate = vi.hoisted(() => ({ allow: true, deniedIds: [] as string[] }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  type Can = typeof real.can;
  const can: Can = async (scope, name, op, ids) => gate.allow && !(ids ?? []).some((id) => gate.deniedIds.includes(id)) && (await real.can(scope, name, op, ids));
  return { ...real, can };
});

import { inviteMember, removeMember, setMemberStatus } from '../app/(dashboard)/members/actions';
import { members } from '@/data/collections';
import { collectionTag } from '@/data/read';

const listen = () => { const seen: unknown[] = []; const off = members.subscribe!((e) => seen.push(e)); return { seen, off }; };

beforeEach(() => { cache.updated.length = 0; cache.fail = false; gate.allow = true; gate.deniedIds = []; });

describe('a page write', () => {
  it('commits, emits one hint and invalidates exactly its tenant collection', async () => {
    const before = (await members.query({})).total;
    const l = listen();
    expect(await inviteMember({ name: 'Ana Ruiz', email: 'ana@northwind.example', role: 'Member', team: 'Engineering' })).toEqual({ ok: true });
    expect((await members.query({})).total).toBe(before + 1);
    expect(cache.updated).toEqual([collectionTag('demo', 'members')]);
    expect(l.seen).toEqual([{ collection: 'members' }]);
    l.off();
  });
  // The cache is bookkeeping after the store's answer. When neither invalidation call works, the write must still be
  // reported as made: the opposite, a FAILED action over a committed row, invites a second press — and a second member or
  // ticket (reported by the data review on 2026-11-15; the keys actions had already learned this, `refreshKeys`).
  it('keeps reporting a committed change when the cache cannot be dropped, and logs why reads may be stale', async () => {
    cache.fail = true;
    const before = (await members.query({})).total;
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await inviteMember({ name: 'Cache Fail', email: 'cache@northwind.example', role: 'Member', team: 'Engineering' })).toEqual({ ok: true });
      expect((await members.query({})).total).toBe(before + 1);
      expect(cache.updated).toEqual([]);
      expect(said).toHaveBeenCalled();
    } finally { said.mockRestore(); }
  });

  it('is refused before it mutates, emits or invalidates when the caller may not make it', async () => {
    gate.allow = false;
    const before = await members.query({});
    const l = listen();
    const r = await removeMember(String(before.rows[0].id));
    expect(r.ok).toBe(false);
    expect((await members.query({})).total).toBe(before.total);
    expect(cache.updated).toEqual([]);
    expect(l.seen).toEqual([]);
    l.off();
  });
  it('is refused for a record the caller may not touch, and allowed for one it may', async () => {
    const { rows } = await members.query({});
    // The caller is the Owner (`members_1`), so the row it may change is a plain Member: neither itself nor an Owner.
    const mine = String(rows.find((m) => m.role === 'Member' && m.status === 'Active')!.id);
    const theirs = String(rows[1].id);
    gate.deniedIds = [theirs];
    const l = listen();
    expect((await setMemberStatus(theirs, 'Suspended')).ok).toBe(false);
    expect(cache.updated).toEqual([]);
    expect(l.seen).toEqual([]);
    expect((await setMemberStatus(mine, 'Suspended')).ok).toBe(true);
    expect(cache.updated).toEqual([collectionTag('demo', 'members')]);
    l.off();
  });
  it('refuses suspending the caller, who is the last active Owner, and changes nothing', async () => {
    const { rows } = await members.query({});
    const caller = String(rows[0].id);
    const before = await members.query({});
    expect(before.rows.some((m) => m.role === 'Owner' && m.status === 'Active')).toBe(true);
    const l = listen();
    expect(await setMemberStatus(caller, 'Suspended')).toEqual({ ok: false, error: 'You cannot suspend or remove yourself.' });
    expect(await members.query({})).toEqual(before);
    expect(cache.updated).toEqual([]);
    expect(l.seen).toEqual([]);
    l.off();
  });
});

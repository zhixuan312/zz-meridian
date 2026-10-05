// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ updated: [] as string[] }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { cache.updated.push(t); }, revalidateTag: () => {} }));
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

beforeEach(() => { cache.updated.length = 0; gate.allow = true; gate.deniedIds = []; });

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
    const mine = String(rows[0].id);
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
});

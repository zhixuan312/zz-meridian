// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const cache = vi.hoisted(() => ({ tags: [] as string[], lives: [] as unknown[] }));
vi.mock('next/cache', () => ({
  cacheTag: (...t: string[]) => { cache.tags.push(...t); },
  cacheLife: (p: unknown) => { cache.lives.push(p); },
  updateTag: () => {},
  revalidateTag: () => {},
}));

const session = vi.hoisted(() => ({ scope: null as null | { tenantId: string; subjectId: string; authorizationKey: string } }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => session.scope ?? real.resolveAccess() };
});

import { arrayCollection, liveListeners, normalizeQuery } from '@/lib/collection';
import { resolveAccess } from '@/data/access';
import { AccessDenied } from '@/data/access';
import { clock, members } from '@/data/collections';
import { collectionTag, read } from '@/data/read';

const people = (tenantId: string) => arrayCollection({
  name: 'people', label: 'People', description: 'People in a tenant.', key: 'id', title: (r: { name: string }) => r.name,
  fields: z.object({ name: z.string().min(1) }), rows: [{ id: 'p1', name: 'Ada' }, { id: 'p0', name: 'Ada' }], allow: ['create'], tenantId,
});

beforeEach(() => { cache.tags.length = 0; cache.lives.length = 0; session.scope = null; });

describe('read', () => {
  it('reads through the scope, tags the tenant collection and keeps the observation time', async () => {
    const out = await read('members', { limit: 5 });
    expect(out.rows.length).toBeLessThanOrEqual(5);
    expect(out.total).toBeGreaterThan(0);
    expect(out.observedAt).toBe(clock().toISOString());
    expect(cache.tags).toContain(collectionTag('demo', 'members'));
    expect(cache.lives).toContainEqual({ stale: 30, revalidate: 60, expire: 3600 });
  });
  it('refuses an unknown collection the same way as a forbidden one, before any cached code runs', async () => {
    const unknown = await read('secrets').catch((e: unknown) => e);
    expect(unknown).toBeInstanceOf(AccessDenied);
    expect(cache.tags).toEqual([]);
    session.scope = { tenantId: 'other-tenant', subjectId: 'intruder', authorizationKey: 'other:1' };
    const forbidden = await read('members').catch((e: unknown) => e);
    expect(forbidden).toBeInstanceOf(AccessDenied);
    expect((forbidden as Error).message).toBe((unknown as Error).message);
    expect(cache.tags).toEqual([]);
  });
  it('resolves a scope with the three frozen fields', async () => {
    const s = await resolveAccess();
    expect(Object.keys(s).sort()).toEqual(['authorizationKey', 'subjectId', 'tenantId']);
  });
});

describe('the tenant tag', () => {
  it('is bounded, deterministic, distinct per tenant and name, and hides the tenant', () => {
    const t = collectionTag('tenant-a', 'members');
    expect(t).toMatch(/^collection:[0-9a-f]{64}$/);
    expect(collectionTag('tenant-a', 'members')).toBe(t);
    expect(collectionTag('tenant-b', 'members')).not.toBe(t);
    expect(collectionTag('tenant-a', 'keys')).not.toBe(t);
    expect(t).not.toContain('tenant-a');
  });
});

describe('normalizeQuery', () => {
  it('defaults and caps the page, and sorts by the key when no sort is asked', () => {
    const n = normalizeQuery(members, {});
    expect(n.limit).toBeGreaterThan(0);
    expect(n.offset).toBe(0);
    expect(n.sort).toEqual({ field: 'id', dir: 'asc' });
    expect(normalizeQuery(members, { limit: 10_000 }).limit).toBeLessThanOrEqual(500);
  });
  it('rejects a field or an operator the collection does not have', () => {
    expect(() => normalizeQuery(members, { where: [{ field: 'password', op: 'eq', value: 'x' }] })).toThrow(/password/);
    expect(() => normalizeQuery(members, { where: [{ field: 'name', op: 'like' as never, value: 'x' }] })).toThrow(/like/);
    expect(() => normalizeQuery(members, { offset: -1 })).toThrow();
  });
});

describe('tenant-bound collections', () => {
  it('keep separate stores and listeners, and emit only after a successful write', async () => {
    const a = people('tenant-a');
    const b = people('tenant-b');
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    const offA = a.subscribe!((e) => seenA.push(e));
    const offB = b.subscribe!((e) => seenB.push(e));
    expect(liveListeners('tenant-a', 'people')).toBe(1);
    await a.create!({ name: 'Grace' });
    await expect(a.create!({ name: '' })).rejects.toThrow();
    expect((await a.query({})).total).toBe(3);
    expect((await b.query({})).total).toBe(2);
    expect(seenA).toEqual([{ collection: 'people' }]);
    expect(seenB).toEqual([]);
    offA();
    offB();
    expect(liveListeners('tenant-a', 'people')).toBe(0);
  });
  it('breaks ties by the key', async () => {
    const { rows } = await people('tenant-c').query({ sort: { field: 'name', dir: 'asc' } });
    expect(rows.map((r) => r.id)).toEqual(['p0', 'p1']);
  });
});

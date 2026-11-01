// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const cache = vi.hoisted(() => ({ fail: true, update: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({ cacheTag() {}, cacheLife() {},
  updateTag: (...args: unknown[]) => { cache.update(...args); if (cache.fail) throw new Error('synthetic cache outage'); },
  revalidateTag: (...args: unknown[]) => { cache.revalidate(...args); if (cache.fail) throw new Error('synthetic fallback outage'); },
}));
import { createKey, revokeKey } from '../app/(dashboard)/keys/actions';
import { collectionFor, resolveAccess } from '@/data/access';

const draft = { name: 'Postcommit probe', env: 'test' as const, scopes: ['messages' as const] };
beforeEach(() => { cache.fail = true; cache.update.mockClear(); cache.revalidate.mockClear(); });
afterEach(() => vi.restoreAllMocks());

describe('key actions after the write has committed', () => {
  it('returns the one-time secret and a warning when cache invalidation fails after creation', async () => {
    const c = collectionFor(await resolveAccess(), 'keys');
    const create = vi.spyOn(c, 'create');
    const result = await createKey(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.key.secret).toMatch(/^zzm_test_[0-9a-f]{32}$/);
    expect(result).toHaveProperty('warning', expect.stringMatching(/applied/i));
    expect(create).toHaveBeenCalledOnce();
    expect((await c.query({ where: [{ field: 'id', op: 'eq', value: result.key.id }] })).rows).toHaveLength(1);
  });

  it('reports a committed revoke as success rather than inviting a second write', async () => {
    cache.fail = false;
    const made = await createKey({ ...draft, name: 'Revoke postcommit probe' });
    if (!made.ok) throw new Error(made.error);
    const c = collectionFor(await resolveAccess(), 'keys');
    const remove = vi.spyOn(c, 'remove');
    cache.fail = true;
    const result = await revokeKey(made.key.id);
    expect(result.ok).toBe(true);
    expect(result).toHaveProperty('warning', expect.stringMatching(/applied/i));
    expect(remove).toHaveBeenCalledOnce();
    expect((await c.query({ where: [{ field: 'id', op: 'eq', value: made.key.id }] })).rows).toHaveLength(0);
  });

  it('still reports a rejected write as failure and does not invalidate it', async () => {
    const c = collectionFor(await resolveAccess(), 'keys');
    vi.spyOn(c, 'create').mockRejectedValueOnce(new Error('synthetic store failure'));
    expect(await createKey(draft)).toEqual({ ok: false, error: 'Could not create the key. Try again.' });
    expect(cache.update).not.toHaveBeenCalled();
  });
});

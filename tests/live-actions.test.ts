// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ updated: [] as string[] }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { cache.updated.push(t); }, revalidateTag: () => {} }));
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock('@/data/access', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/access')>();
  return { ...real, resolveAccess: async () => { if (!session.signedIn) throw new real.Unauthenticated(); return real.resolveAccess(); } };
});

import { refreshCollections } from '@/data/live-actions';
import { collectionTag } from '@/data/read';

beforeEach(() => { cache.updated.length = 0; session.signedIn = true; });

describe('refreshCollections', () => {
  it('invalidates only the collections the caller may read, once each', async () => {
    await refreshCollections(['members', 'secrets', 'members', 'keys']);
    expect(cache.updated.sort()).toEqual([collectionTag('demo', 'keys'), collectionTag('demo', 'members')].sort());
  });
  it('refuses an unauthenticated caller and invalidates nothing', async () => {
    session.signedIn = false;
    await expect(refreshCollections(['members'])).rejects.toThrow();
    expect(cache.updated).toEqual([]);
  });
});

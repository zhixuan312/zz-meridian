/**
 * The pages' read: authorized, scoped and cached. A page calls `read()`; it cannot choose a tenant, and the cached
 * helper below sees only the whole scope, the collection's name and the normalized query. A write calls
 * `updateTag(collectionTag(tenantId, name))` after it commits, which drops every user's cached variants of that
 * collection and nobody else's.
 */
import { createHash } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { normalizeQuery, type Query } from '@/lib/collection';
import { AccessDenied, collectionFor, can, resolveAccess, type AccessScope } from '@/data/access';
import { clock } from '@/data/collections';

/** `collection:` and the SHA-256 of the tenant and the name: bounded, deterministic and free of any raw identifier. */
export const collectionTag = (tenantId: string, name: string): string =>
  `collection:${createHash('sha256').update(JSON.stringify([tenantId, name])).digest('hex')}`;

async function cachedRead(scope: AccessScope, name: string, query: Query) {
  'use cache';
  cacheTag(collectionTag(scope.tenantId, name));
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const { rows, total } = await collectionFor(scope, name).query(query);
  return { rows, total, observedAt: clock().toISOString() };
}

/** The rows of a collection the caller may read, with the time the read actually ran. Throws before any cached code runs when it may not. */
export async function read(name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; total: number; observedAt: string }> {
  const scope = await resolveAccess();
  if (!(await can(scope, name, 'read'))) throw new AccessDenied();
  return cachedRead(scope, name, normalizeQuery(collectionFor(scope, name), q));
}

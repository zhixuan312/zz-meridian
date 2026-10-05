'use server';

import { updateTag } from 'next/cache';
import { Unauthenticated, can, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';

const MAX_NAMES = 50;

/**
 * Drops the cached reads of the collections the caller may read, so the router refresh that follows reads them again.
 * The names come from the browser, so each is authorized here; one the caller may not read is skipped without a trace.
 * A caller without a session gets a refusal value, not a throw: a thrown error loses its status in a production build.
 */
export async function refreshCollections(names: string[]): Promise<{ ok: true } | { ok: false; status: 401 }> {
  const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
  if (!scope) return { ok: false, status: 401 };
  const asked = [...new Set(Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : [])].slice(0, MAX_NAMES);
  for (const name of asked) {
    if (await can(scope, name, 'read')) updateTag(collectionTag(scope.tenantId, name));
  }
  return { ok: true };
}

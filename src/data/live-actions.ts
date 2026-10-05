'use server';

import { updateTag } from 'next/cache';
import { can, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';

const MAX_NAMES = 50;

/**
 * Drops the cached reads of the collections the caller may read, so the router refresh that follows reads them again.
 * The names come from the browser, so each is authorized here; one the caller may not read is skipped without a trace.
 */
export async function refreshCollections(names: string[]): Promise<void> {
  const scope = await resolveAccess();
  const asked = [...new Set(Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : [])].slice(0, MAX_NAMES);
  for (const name of asked) {
    if (await can(scope, name, 'read')) updateTag(collectionTag(scope.tenantId, name));
  }
}

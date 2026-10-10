'use server';

import { createHash, randomBytes } from 'node:crypto';
import { updateTag } from 'next/cache';
import { z } from 'zod';
import { clock } from '@/data/collections';
import { AccessDenied, can, collectionFor, nameOf, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';
import { SCOPES } from '@/views/key-scopes';
import type { ApiKey } from '@/data/sample';

const draft = z.object({
  name: z.string().trim().min(1, 'Name the key.'),
  env: z.enum(['live', 'test']),
  scopes: z.array(z.enum(SCOPES), { error: 'Choose only the scopes a key can carry.' }).min(1, 'Give the key at least one scope.'),
});

/**
 * Creates a key and returns it with its full secret: the only moment the secret exists outside the caller's own copy.
 * What is stored is the key's hint (its prefix and last four characters) and the secret's SHA-256, never the secret.
 * The key's owner is the caller — the person the policy names — so a key Lucas makes records Lucas, never the sample's
 * own person; `subjectId` is the honest fallback when the policy names nobody.
 */
export async function createKey(input: z.input<typeof draft>): Promise<ApiKey & { secret: string }> {
  const { name, env, scopes } = draft.parse(input);
  const scope = await resolveAccess();
  if (!(await can(scope, 'keys', 'create'))) throw new AccessDenied();
  const secret = `zzm_${env}_${randomBytes(16).toString('hex')}`;
  const hint = `zzm_${env}_…${secret.slice(-4)}`;
  const secretHash = createHash('sha256').update(secret).digest('hex');
  const owner = (await nameOf(scope)) ?? scope.subjectId;
  const key = await collectionFor(scope, 'keys').create!({ name, env, scopes, owner, created: clock().toISOString(), lastUsed: null, hint, secretHash });
  updateTag(collectionTag(scope.tenantId, 'keys'));
  return { ...(key as ApiKey), secret };
}

export async function revokeKey(id: string): Promise<void> {
  const scope = await resolveAccess();
  if (!(await can(scope, 'keys', 'remove', [id]))) throw new AccessDenied();
  await collectionFor(scope, 'keys').remove!([id]);
  updateTag(collectionTag(scope.tenantId, 'keys'));
}

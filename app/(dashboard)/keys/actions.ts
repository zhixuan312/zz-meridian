'use server';

import { randomBytes } from 'node:crypto';
import { updateTag } from 'next/cache';
import { z } from 'zod';
import { app } from '@/app.config';
import { clock } from '@/data/collections';
import { AccessDenied, can, collectionFor, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';
import type { ApiKey } from '@/data/sample';

const draft = z.object({
  name: z.string().trim().min(1, 'Name the key.'),
  env: z.enum(['live', 'test']),
  scopes: z.array(z.string()),
});

/** Creates a key and returns it: the only moment its full secret leaves the server for a banner. */
export async function createKey(input: z.input<typeof draft>): Promise<ApiKey> {
  const { name, env, scopes } = draft.parse(input);
  const scope = await resolveAccess();
  if (!(await can(scope, 'keys', 'create'))) throw new AccessDenied();
  const key = await collectionFor(scope, 'keys').create!({ name, env, scopes, owner: app.user.name, created: clock().toISOString(), lastUsed: null, secret: `zzm_${env}_${randomBytes(16).toString('hex')}` });
  updateTag(collectionTag(scope.tenantId, 'keys'));
  return key;
}

export async function revokeKey(id: string): Promise<void> {
  const scope = await resolveAccess();
  if (!(await can(scope, 'keys', 'remove', [id]))) throw new AccessDenied();
  await collectionFor(scope, 'keys').remove!([id]);
  updateTag(collectionTag(scope.tenantId, 'keys'));
}

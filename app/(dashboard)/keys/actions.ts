'use server';

import { createHash, randomBytes } from 'node:crypto';
import { updateTag } from 'next/cache';
import { z } from 'zod';
import { clock } from '@/data/collections';
import { Unauthenticated, can, collectionFor, nameOf, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';
import { projectKey, type PublicKey } from '@/data/projections';
import { SCOPES } from '@/logic/key-scopes';

const draft = z.object({
  name: z.string().trim().min(1, 'Name the key.'),
  env: z.enum(['live', 'test']),
  scopes: z.array(z.enum(SCOPES, { error: 'Choose only the scopes a key can carry.' })).min(1, 'Give the key at least one scope.'),
});

/** What a key action answers: a thrown error's message does not reach the browser in a production build, a result does. */
export type KeyResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** The sentence for a failure this action did not write itself: a store's own words are not the person's to read. */
const said = (e: unknown, what: string) => (e instanceof Unauthenticated ? `Sign in again to ${what}.` : `Could not ${what}. Try again.`);

/**
 * Creates a key and returns it with its full secret: the only moment the secret exists outside the caller's own copy.
 * What is stored is the key's hint (its prefix and last four characters) and the secret's SHA-256, never the secret.
 * The key's owner is the caller — the person the policy names — so a key Lucas makes records Lucas, never the sample's
 * own person; `subjectId` is the honest fallback when the policy names nobody.
 */
export async function createKey(input: z.input<typeof draft>): Promise<KeyResult<{ key: PublicKey & { secret: string } }>> {
  const parsed = draft.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, env, scopes } = parsed.data;
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'keys', 'create'))) return { ok: false, error: 'You do not have permission to create keys.' };
    const secret = `zzm_${env}_${randomBytes(16).toString('hex')}`;
    const hint = `zzm_${env}_…${secret.slice(-4)}`;
    const secretHash = createHash('sha256').update(secret).digest('hex');
    const owner = (await nameOf(scope)) ?? scope.subjectId;
    const key = await collectionFor(scope, 'keys').create!({ name, env, scopes, owner, created: clock().toISOString(), lastUsed: null, hint, secretHash });
    updateTag(collectionTag(scope.tenantId, 'keys'));
    return { ok: true, key: { ...projectKey(key), secret } };
  } catch (e) {
    return { ok: false, error: said(e, 'create the key') };
  }
}

export async function revokeKey(id: string): Promise<KeyResult> {
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'keys', 'remove', [id]))) return { ok: false, error: 'You do not have permission to revoke this key.' };
    await collectionFor(scope, 'keys').remove!([id]);
    updateTag(collectionTag(scope.tenantId, 'keys'));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: said(e, 'revoke the key') };
  }
}

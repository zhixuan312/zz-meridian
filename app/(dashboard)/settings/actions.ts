'use server';

import { updateTag } from 'next/cache';
import { AccessDenied, Unauthenticated, collectionFor, requireNeed, resolveAccess } from '@/data/access';
import { ACTIONS } from '@/data/features';
import { collectionTag } from '@/data/read';
import type { ActionResult } from '@/lib/collection';

/** The name a Settings save carries; the address is not editable here. */
export type WorkspaceInput = { name: string };

// The refusals this action chose are shown as they are; a write that threw anything else — a collection rejecting a
// shape, a connection dropping — is not the person's to read, and says only that it did not go through.
const fail = (e: unknown): ActionResult => ({
  ok: false,
  error: e instanceof Unauthenticated ? 'Sign in again to make this change.'
    : e instanceof AccessDenied ? 'You do not have permission to make this change.'
    : 'The change did not go through.',
});

/**
 * Saves the workspace through the `workspace` collection: the action table's `save-workspace` need is asked first, then
 * the caller's own collection is written and only after the commit its cached reads are dropped.
 *
 * It returns the shared `Result` shape and never throws at the person: a refusal is a sentence beside the fields, and a
 * refused change writes nothing, emits nothing and invalidates nothing.
 */
export async function saveWorkspace(input: WorkspaceInput): Promise<ActionResult> {
  const name = String(input?.name ?? '').trim();
  if (!name) return { ok: false, error: 'Give the workspace a name: an invitation names it.' };
  try {
    await requireNeed(ACTIONS['save-workspace'].needs);
    const scope = await resolveAccess();
    await collectionFor(scope, 'workspace').update!(['workspace'], { name });
    updateTag(collectionTag(scope.tenantId, 'workspace'));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

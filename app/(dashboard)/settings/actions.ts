'use server';

import { updateTag } from 'next/cache';
import { AccessDenied, Unauthenticated, collectionFor, requireNeed, resolveAccess } from '@/data/access';
import { ACTIONS } from '@/data/features';
import { collectionTag } from '@/data/read';
import type { Result } from '@/views/members';

/** The name a Settings save carries; the address is not editable here. */
export type WorkspaceInput = { name: string };

const fail = (e: unknown): Result => ({
  ok: false,
  error: e instanceof Unauthenticated ? 'Sign in again to make this change.'
    : e instanceof AccessDenied ? 'You do not have permission to make this change.'
    : e instanceof Error ? e.message : 'The change did not go through.',
});

/**
 * Saves the workspace through the `workspace` collection: the action table's `save-workspace` need is asked first, then
 * the caller's own collection is written and only after the commit its cached reads are dropped.
 *
 * It returns the shared `Result` shape and never throws at the person: a refusal is a sentence beside the fields, and a
 * refused change writes nothing, emits nothing and invalidates nothing.
 */
export async function saveWorkspace(input: WorkspaceInput): Promise<Result> {
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

'use server';

import { updateTag } from 'next/cache';
import { clock } from '@/data/collections';
import { can, collectionFor, resolveAccess, Unauthenticated } from '@/data/access';
import { collectionTag } from '@/data/read';
import type { AnyCollection } from '@/lib/collection';
import type { Result } from '@/views/members';
import { ROLES, TEAMS, STATUSES, type Member } from '@/system/fixtures/sample-members';

const fail = (e: unknown): Result => ({
  ok: false,
  error: e instanceof Unauthenticated ? 'Sign in again to make this change.' : e instanceof Error ? e.message : 'The change did not go through.',
});

/**
 * Run one change against the members collection: authorize it and every record it touches, write through the caller's
 * own collection, and only after the commit drop the tenant's cached reads. A rejection becomes a reason, never a thrown
 * error, and a refused change writes nothing, emits nothing and invalidates nothing.
 */
async function run(op: 'create' | 'update' | 'remove', ids: string[] | undefined, change: (c: AnyCollection) => Promise<unknown>): Promise<Result> {
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'members', op, ids))) return { ok: false, error: 'You do not have permission to make this change.' };
    await change(collectionFor(scope, 'members'));
    updateTag(collectionTag(scope.tenantId, 'members'));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function inviteMember(input: { name: string; email: string; role: Member['role']; team: Member['team'] }): Promise<Result> {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim();
  if (!name) return { ok: false, error: 'Name the person you are inviting.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter their work email, like ana@northwind.example.' };
  if (!ROLES.includes(input.role) || !TEAMS.includes(input.team)) return { ok: false, error: 'Choose a role and a team from the lists.' };
  return run('create', undefined, (c) => c.create!({ name, email, role: input.role, team: input.team, status: 'Invited', joined: clock().toISOString().slice(0, 10), lastActive: null }));
}

export async function setMemberStatus(id: string, status: Member['status']): Promise<Result> {
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };
  return run('update', [id], (c) => c.update!([id], { status }));
}

export async function removeMember(id: string): Promise<Result> {
  return run('remove', [id], (c) => c.remove!([id]));
}

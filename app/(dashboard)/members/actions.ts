'use server';

import { clock } from '@/data/collections';
import { can, collectionFor, resolveAccess, Unauthenticated } from '@/data/access';
import { assignMemberRole, REFUSALS } from '@/data/member-mutations';
import type { AnyCollection } from '@/lib/collection';
import type { Result } from '@/views/members';
import { STATUSES, TEAMS, type Member } from '@/data/sample';
import { MAIN_ROLES, type AddOn, type MainRole } from '@/data/roles';

const fail = (e: unknown): Result => ({
  ok: false,
  error: e instanceof Unauthenticated ? REFUSALS.signIn : e instanceof Error ? e.message : 'The change did not go through.',
});

/**
 * Run one change against the members collection: authorize it and every record it touches, then write through the
 * caller's own collection — which is the member boundary, so the Owner, self and last-active-Owner rules apply and the
 * tenant's cached reads drop only after the step commits. A rejection becomes a reason, never a thrown error, and a
 * refused change writes nothing, emits nothing and invalidates nothing.
 */
async function run(op: 'create' | 'update' | 'remove', ids: string[] | undefined, change: (c: AnyCollection) => Promise<unknown>): Promise<Result> {
  try {
    const scope = await resolveAccess();
    if (!(await can(scope, 'members', op, ids))) return { ok: false, error: REFUSALS.noGrant };
    await change(collectionFor(scope, 'members'));
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
  if (!MAIN_ROLES.includes(input.role) || !TEAMS.includes(input.team)) return { ok: false, error: 'Choose a role and a team from the lists.' };
  // The boundary decides the role the caller may give — an Admin inviting an Owner is refused there with the frozen
  // rule's message — so this path only shapes the invitation.
  return run('create', undefined, (c) => c.create!({ name, email, role: input.role, team: input.team, status: 'Invited', joined: clock().toISOString().slice(0, 10), lastActive: null }));
}

export async function setMemberStatus(id: string, status: Member['status']): Promise<Result> {
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };
  return run('update', [id], (c) => c.update!([id], { status }));
}

export async function removeMember(id: string): Promise<Result> {
  return run('remove', [id], (c) => c.remove!([id]));
}

/** A member's role and add-ons change only here: the boundary decides, and a row the caller may not change is refused. */
export async function assignRole(input: { id: string; role: MainRole; addOns: AddOn[] }): Promise<Result> {
  try {
    // The boundary re-reads the caller and the target and refuses with the frozen message, so this path does not
    // decide it a second time.
    await assignMemberRole(input);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

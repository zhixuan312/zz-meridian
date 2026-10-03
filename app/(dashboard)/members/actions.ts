'use server';

import { clock, members } from '@/data/collections';
import type { Result } from '@/views/members';
import { ROLES, TEAMS, STATUSES, type Member } from '@/system/fixtures/sample-members';

const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : 'The change did not go through.' });

/** Run one change against the members collection; a rejection becomes a reason, never a thrown error. */
async function run(change: () => Promise<unknown>): Promise<Result> {
  try {
    await change();
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
  return run(() => members.create!({ name, email, role: input.role, team: input.team, status: 'Invited', joined: clock().toISOString().slice(0, 10), lastActive: null }));
}

export async function setMemberStatus(id: string, status: Member['status']): Promise<Result> {
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };
  return run(() => members.update!([id], { status }));
}

export async function removeMember(id: string): Promise<Result> {
  return run(() => members.remove!([id]));
}

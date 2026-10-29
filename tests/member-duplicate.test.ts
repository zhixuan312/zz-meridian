// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { inviteMember } from '../app/(dashboard)/members/actions';
import { members } from '@/data/collections';
import { resolveAccess } from '@/data/access';
import { membersFor } from '@/data/member-mutations';

const withAddress = async (email: string) => (await members.query({})).rows.filter((m) => m.email.toLowerCase() === email.toLowerCase());

beforeEach(() => { jar.value = 'members_1'; });

describe('inviting an address the workspace already has', () => {
  it('is refused with a reason, and no second member is written', async () => {
    const email = `twin.${Math.random().toString(36).slice(2)}@northwind.example`;
    expect(await inviteMember({ name: 'Ana Ruiz', email, role: 'Member', team: 'Engineering' })).toEqual({ ok: true });
    expect(await withAddress(email)).toHaveLength(1);
    const again = await inviteMember({ name: 'Ana R.', email: email.toUpperCase(), role: 'Member', team: 'Engineering' });
    expect(again).toEqual({ ok: false, error: expect.stringMatching(/already/i) });
    expect(await withAddress(email)).toHaveLength(1);
  });

  it('is refused for somebody who is already a member, whoever invites them', async () => {
    const existing = (await members.query({})).rows[0];
    expect(await inviteMember({ name: 'Somebody Else', email: existing.email, role: 'Viewer', team: 'Engineering' })).toEqual({ ok: false, error: expect.stringMatching(/already/i) });
  });
});

describe('changing a member to an address the workspace already has', () => {
  it('is refused, and the member keeps their own address', async () => {
    const [, a, b] = (await members.query({})).rows;
    const scoped = membersFor(await resolveAccess());
    await expect(scoped.update!([a.id], { email: b.email.toUpperCase() })).rejects.toThrow(/already/i);
    await expect(scoped.update!([a.id, b.id], { email: 'one.for.two@northwind.example' })).rejects.toThrow(/already/i);
    expect((await members.query({})).rows.find((m) => m.id === a.id)?.email).toBe(a.email);
  });
});

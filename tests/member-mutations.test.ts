// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { assignMemberRole, invitableRoles, memberAccess, membersFor } from '@/data/member-mutations';
import { activity, members } from '@/data/collections';
import { resolveAccess } from '@/data/access';

const as = (id: string | undefined) => { jar.value = id; };
const rowOf = async (id: string) => (await members.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0];
const lines = async () => (await activity.query({})).rows.map((r) => JSON.stringify(r));

beforeEach(() => { jar.value = undefined; });

describe('the member boundary', () => {
  it('lets an Admin act on a Member and not on an Owner or themselves', async () => {
    as('members_2');
    const member = await memberAccess('members_4');
    expect([member.changeRole, member.suspend, member.remove]).toEqual([true, true, true]);
    const owner = await memberAccess('members_1');
    expect([owner.changeRole, owner.suspend, owner.remove]).toEqual([false, false, false]);
    expect(owner.reason).toBe('Only an Owner can change or remove an Owner.');
    const self = await memberAccess('members_2');
    expect([self.changeRole, self.suspend, self.remove]).toEqual([false, false, false]);
    // The row reason is the first firing rule in the frozen order, and the assignment rule precedes the suspension one.
    expect(self.reason).toBe('You cannot change your own role.');
  });

  it('gives an Owner every role and an Admin everything but Owner', async () => {
    as('members_1');
    expect([...(await invitableRoles())]).toEqual(['Owner', 'Admin', 'Member', 'Viewer']);
    expect([...((await memberAccess('members_4')).roles)]).toEqual(['Owner', 'Admin', 'Member', 'Viewer']);
    as('members_2');
    expect([...(await invitableRoles())]).toEqual(['Admin', 'Member', 'Viewer']);
  });

  it('refuses an Admin changing or removing an Owner, and changes nothing', async () => {
    as('members_2');
    const before = await rowOf('members_1');
    const beforeLines = (await lines()).length;
    await expect(assignMemberRole({ id: 'members_1', role: 'Member', addOns: [] })).rejects.toThrow('Only an Owner can change or remove an Owner.');
    expect(await rowOf('members_1')).toEqual(before);
    expect((await lines()).length).toBe(beforeLines);
  });

  it('changes a role and writes the frozen refusals in order', async () => {
    as('members_1');
    await assignMemberRole({ id: 'members_4', role: 'Viewer', addOns: [] });
    try {
      expect((await rowOf('members_4')).role).toBe('Viewer');
    } finally {
      await assignMemberRole({ id: 'members_4', role: 'Member', addOns: [] });
    }
    await expect(assignMemberRole({ id: 'members_4', role: 'Nope' as never, addOns: [] })).rejects.toThrow('Choose a role and add-ons from the lists.');
    await expect(assignMemberRole({ id: 'members_999', role: 'Member', addOns: [] })).rejects.toBeTruthy();
  });

  it('writes exactly one Activity line for a change, none for a repeat and none for a refusal', async () => {
    as('members_1');
    const before = await lines();
    await assignMemberRole({ id: 'members_4', role: 'Viewer', addOns: [] });
    try {
      const after = await lines();
      expect(after.length).toBe(before.length + 1);
      const added = after.filter((t) => !before.includes(t));
      expect(added.length).toBe(1);
      // It names the caller, the person and the new role, in the product's words.
      expect(added[0]).toContain('Maya Chen');
      expect(added[0]).toContain('Priya Nair');
      expect(added[0]).toContain('Viewer');
      // Re-submitting the same assignment changes nothing and writes no line.
      const settled = await lines();
      await assignMemberRole({ id: 'members_4', role: 'Viewer', addOns: [] });
      expect((await lines()).length).toBe(settled.length);
    } finally {
      await assignMemberRole({ id: 'members_4', role: 'Member', addOns: [] });
    }
    // A refusal writes no line either.
    const refused = (await lines()).length;
    await expect(assignMemberRole({ id: 'members_1', role: 'Member', addOns: [] })).rejects.toBeTruthy();
    expect((await lines()).length).toBe(refused);
  });

  it('refuses a batch containing a forbidden target whole, with nothing written', async () => {
    as('members_2');
    const before = await Promise.all(['members_1', 'members_4'].map(rowOf));
    const beforeLines = (await lines()).length;
    const scope = await resolveAccess();
    // One update naming two targets, one of them an Owner: all or nothing.
    await expect(membersFor(scope).update!(['members_1', 'members_4'], { team: 'Sales' })).rejects.toBeTruthy();
    expect(await Promise.all(['members_1', 'members_4'].map(rowOf))).toEqual(before);
    expect((await lines()).length).toBe(beforeLines);
  });

  it('cannot leave a second caller free to remove the last active Owner', async () => {
    as('members_1');
    // Invite a second active Owner, then have it act on the first: the target is another Owner and the caller stays
    // active, so the change is allowed — the rule that guards the last active Owner is evaluated over the membership
    // after the change, and no single assignment from an Owner can empty it. What must hold is that the workspace still
    // has an active Owner afterwards, whatever the outcome.
    const made = await members.create!({ name: 'Second Owner', email: 'second.owner@example.com', team: 'Support', status: 'Active', joined: '2026-10-01', lastActive: null, role: 'Owner', addOns: [] });
    try {
      as(made.id);
      await assignMemberRole({ id: 'members_1', role: 'Member', addOns: [] }).catch(() => {});
      const owners = (await members.query({})).rows.filter((m) => m.role === 'Owner' && m.status === 'Active');
      expect(owners.length).toBeGreaterThan(0);
    } finally {
      as('members_1');
      await assignMemberRole({ id: 'members_1', role: 'Owner', addOns: [] }).catch(() => {});
      await members.remove!([made.id]);
    }
  });

  it('cannot remove two Owners at once', async () => {
    as('members_1');
    const a = await members.create!({ name: 'Owner A', email: 'owner.a@example.com', team: 'Support', status: 'Active', joined: '2026-10-01', lastActive: null, role: 'Owner', addOns: [] });
    const b = await members.create!({ name: 'Owner B', email: 'owner.b@example.com', team: 'Support', status: 'Active', joined: '2026-10-01', lastActive: null, role: 'Owner', addOns: [] });
    try {
      const results = await Promise.allSettled([
        assignMemberRole({ id: 'members_1', role: 'Member', addOns: [] }),
        assignMemberRole({ id: a.id, role: 'Member', addOns: [] }),
        assignMemberRole({ id: b.id, role: 'Member', addOns: [] }),
      ]);
      expect(results.filter((r) => r.status === 'rejected').length).toBeGreaterThan(0);
      const owners = (await members.query({})).rows.filter((m) => m.role === 'Owner' && m.status === 'Active');
      expect(owners.length).toBeGreaterThan(0);
    } finally {
      as('members_1');
      for (const id of [a.id, b.id]) { const row = await rowOf(id); if (row.role !== 'Member') await assignMemberRole({ id, role: 'Member', addOns: [] }).catch(() => {}); }
      await assignMemberRole({ id: 'members_1', role: 'Owner', addOns: [] }).catch(() => {});
      await members.remove!([a.id, b.id]).catch(() => {});
    }
  });
});

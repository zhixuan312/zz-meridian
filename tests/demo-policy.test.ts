// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined, set: [] as [string, string][] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined),
    set: (n: string, v: string) => { jar.set.push([n, v]); },
  }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { Unauthenticated, can, resolveAccess } from '@/data/access';
import { chooseViewAs } from '@/data/view-as';
import { members } from '@/data/collections';

const as = async (id?: string) => { jar.value = id; return resolveAccess(); };
beforeEach(() => { jar.value = undefined; jar.set.length = 0; });

describe('the demo policy', () => {
  it('signs in as Maya Chen with no cookie, with a three-field scope', async () => {
    expect(await as()).toEqual({ tenantId: 'demo', subjectId: 'members_1', authorizationKey: 'demo:members_1:Owner:' });
    expect((await as('members_5')).authorizationKey).toBe('demo:members_5:Member:Key manager');
  });

  it('builds the key from the member record, for a member with an add-on and for a repeated one', async () => {
    const made = await members.create!({ name: 'Key Person', email: 'key.person@example.com', team: 'Support', status: 'Active', joined: '2026-10-01', lastActive: null, role: 'Member', addOns: ['Key manager', 'Key manager'] });
    try {
      expect((await as(made.id)).authorizationKey).toBe(`demo:${made.id}:Member:Key manager`);
    } finally {
      await members.remove!([made.id]);
    }
    // With one entry in ADD_ONS, "the same add-ons in another order" has no observable case; the key takes them deduped
    // and sorted, which is what a second add-on would exercise.
  });

  it('gives no session for an unknown, a Suspended or an Invited member', async () => {
    await expect(as('members_999')).rejects.toBeInstanceOf(Unauthenticated);
    await expect(as('members_19')).rejects.toBeInstanceOf(Unauthenticated);
    await expect(as('members_21')).rejects.toBeInstanceOf(Unauthenticated);
  });

  it('answers from effective grants, limited to what each collection supports', async () => {
    const lucas = await as('members_5');
    const priya = await as('members_4');
    const maya = await as('members_1');
    const grace = await as('members_12');
    expect([await can(lucas, 'keys', 'create'), await can(lucas, 'keys', 'remove'), await can(lucas, 'members', 'update')]).toEqual([true, true, false]);
    expect([await can(priya, 'keys', 'create'), await can(priya, 'keys', 'remove'), await can(priya, 'members', 'update')]).toEqual([false, false, false]);
    expect(await can(maya, 'keys', 'update')).toBe(false);
    expect([await can(grace, 'keys', 'read'), await can(grace, 'members', 'read'), await can(grace, 'requests', 'read')]).toEqual([false, false, true]);
  });

  it('re-reads the record: a role change moves the key and the grants at the next call', async () => {
    const before = await as('members_4');
    await members.update!(['members_4'], { role: 'Viewer' });
    try {
      const after = await as('members_4');
      expect(after.authorizationKey).toBe('demo:members_4:Viewer:');
      expect(await can(after, 'keys', 'read')).toBe(false);
      expect(await can(before, 'keys', 'read')).toBe(false);
    } finally {
      await members.update!(['members_4'], { role: 'Member' });
    }
  });

  it('stops a member suspended mid-session at their next operation', async () => {
    const lucas = await as('members_5');
    await members.update!(['members_5'], { status: 'Suspended' });
    try {
      expect(await can(lucas, 'keys', 'read')).toBe(false);
      await expect(as('members_5')).rejects.toBeInstanceOf(Unauthenticated);
    } finally {
      await members.update!(['members_5'], { status: 'Active' });
    }
  });

  it('lets an Admin change a Member but not an Owner', async () => {
    const jonas = await as('members_2');
    expect(await can(jonas, 'members', 'update', ['members_4'])).toBe(true);
    expect(await can(jonas, 'members', 'update', ['members_1'])).toBe(false);
    expect(await can(jonas, 'members', 'remove', ['members_1'])).toBe(false);
  });
});

describe('the View as choice', () => {
  it('chooses an Active persona and refuses anything else, setting nothing', async () => {
    await chooseViewAs('members_12');
    expect(jar.set).toEqual([['zz_meridian_view_as', 'members_12']]);
    jar.set.length = 0;
    await expect(chooseViewAs('members_999')).rejects.toThrow();
    await expect(chooseViewAs('members_3')).rejects.toThrow();
    await members.update!(['members_12'], { status: 'Suspended' });
    try {
      await expect(chooseViewAs('members_12')).rejects.toThrow();
    } finally {
      await members.update!(['members_12'], { status: 'Active' });
    }
    expect(jar.set).toEqual([]);
  });
});

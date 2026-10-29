// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { Unauthenticated, can, may, resolveAccess } from '@/data/access';
import { ACTIONS, FEATURES } from '@/data/features';
import { clock, collections, members } from '@/data/collections';
import { aggregate, read } from '@/data/read';
import { membersFor } from '@/data/member-mutations';
import { handedTo } from '@/lib/assistant/scoped';
import { assistantTools } from '@/lib/assistant/tools';
import { viewTools } from '@/logic/tools';

const writer = { write() {}, merge() {}, onError: undefined } as never;
const guard = { authorize: async () => true, invalidate: () => {}, record: async () => {} };
const shapeKeys = (tools: Record<string, unknown>, name: string) => Object.keys(((tools[name] as { inputSchema: { shape: Record<string, unknown> } }).inputSchema).shape);
const setKeys = (tools: Record<string, unknown>, name: string) => Object.keys(((tools[name] as { inputSchema: { shape: { set: { shape: Record<string, unknown> } } } }).inputSchema).shape.set.shape);
const run = (tools: Record<string, unknown>, name: string, input: unknown) => (tools[name] as { execute: (i: unknown, o: unknown) => Promise<unknown> }).execute(input, { toolCallId: 'check', messages: [] });

beforeEach(() => { jar.value = undefined; });

describe('what the assistant may reach, by the person it acts for', () => {
  it('drops the write operations a Viewer may not perform', async () => {
    jar.value = 'members_12';
    for (const need of ['members:create', 'members:update', 'members:remove', 'keys:create', 'keys:remove'] as const) expect(await may(need), need).toBe(false);
    expect(await may(FEATURES.keys.needs)).toBe(false);
    expect(await may(FEATURES.members.needs)).toBe(false);
    // The route hands the builder the members collection through `handedTo` under the Viewer's own scope, with its
    // forbidden operations gone, so no write tool is built for them.
    const scope = await resolveAccess();
    const handed = await handedTo(scope, membersFor(scope), 'members');
    expect([handed.create, handed.update, handed.remove]).toEqual([undefined, undefined, undefined]);
    expect(Object.keys(assistantTools([handed], writer, guard).tools)).toEqual([]);
  });

  it('registers every view tool and every action for the Owner', async () => {
    jar.value = 'members_1';
    for (const v of viewTools) expect(await may(v.needs), v.name).toBe(true);
    for (const [id, action] of Object.entries(ACTIONS)) expect(await may(action.needs), id).toBe(true);
  });

  it('gives a Key manager the keys but no member action, and still the members page', async () => {
    jar.value = 'members_5';
    expect(await may(ACTIONS['create-key'].needs)).toBe(true);
    expect(await may(ACTIONS['invite-member'].needs)).toBe(false);
    expect(await may(ACTIONS['remove-member'].needs)).toBe(false);
    // An add-on can only widen what a person holds: a Member reads members, so the Key manager does too.
    expect(await may(FEATURES.members.needs)).toBe(true);
  });

  it('hands a Member the members collection without a create tool, through the route\'s own mapping', async () => {
    // This drives the mapping the route runs, in its order: the create override comes before the narrowing, and a
    // Member must still end with no write tool at all.
    jar.value = 'members_4';
    const scope = await resolveAccess();
    const handed = await handedTo(scope, membersFor(scope), 'members');
    expect(Object.keys(assistantTools([handed], writer, guard).tools)).toEqual([]);
    // And the Owner, whose create is allowed, keeps it — forced to Member with no add-ons.
    jar.value = 'members_1';
    const ownerScope = await resolveAccess();
    const ownerHanded = await handedTo(ownerScope, membersFor(ownerScope), 'members');
    const made = (await (ownerHanded.create as (i: Record<string, unknown>) => Promise<Record<string, unknown>>)({ name: 'Agent Made', email: 'agent.made@example.com', team: 'Support', status: 'Invited', joined: '2026-10-10', lastActive: null, role: 'Owner', addOns: ['Key manager'] })) as { id: string; role: string; addOns: string[] };
    try {
      expect([made.role, made.addOns]).toEqual(['Member', []]);
    } finally {
      await members.remove!([made.id]);
    }
  });

  it('hands the assistant only the operations the person may perform', async () => {
    // A Member reads members and writes none: no write tool is built for one: the tools are filtered when they are registered.
    jar.value = 'members_4';
    const member = await handedTo(await resolveAccess(), { ...members }, 'members');
    expect([member.create, member.update, member.remove]).toEqual([undefined, undefined, undefined]);
    expect(Object.keys(assistantTools([member], writer, guard).tools)).toEqual([]);
    // The Owner keeps them all, and a Key manager keeps only the key operations it has.
    jar.value = 'members_1';
    expect(Object.keys(assistantTools([await handedTo(await resolveAccess(), { ...members }, 'members')], writer, guard).tools)).toContain('update_members');
    jar.value = 'members_5';
    const keyManager = await handedTo(await resolveAccess(), { ...members }, 'members');
    expect(keyManager.update).toBeUndefined();
  });

  it('keeps role and addOns out of the agent write schemas', async () => {
    jar.value = 'members_1';
    const { tools } = assistantTools([members], writer, guard);
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).not.toContain('role');
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).not.toContain('addOns');
    expect(setKeys(tools as Record<string, unknown>, 'update_members')).not.toContain('role');
    expect(setKeys(tools as Record<string, unknown>, 'update_members')).not.toContain('addOns');
    // The other fields stay writable.
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).toContain('name');
    expect([...(members.pageOnlyFields ?? [])]).toEqual(['role', 'addOns']);
  });

  it('reads nothing through an already-handed prepared query once the person has been suspended', async () => {
    // The route hands the page's prepared query under the person's rights, reading through `aggregate()` and `read()`,
    // which ask the grant again at the moment a call runs.
    jar.value = 'members_4';
    const scope = await resolveAccess();
    const readable = new Set<string>();
    for (const c of collections) if (await can(scope, c.name, 'read')) readable.add(c.name);
    const view = viewTools.find((v) => v.page === '/members')!;
    const rights = { readable, hidden: (name: string) => ((collections.find((c) => c.name === name)?.hidden ?? []) as string[]) };
    const explore = { view, rights, io: { aggregate, read: (name: string, q: Parameters<typeof read>[1]) => read(name, q), today: clock().toISOString().slice(0, 10) }, page: '/members' };
    const { tools } = assistantTools([await handedTo(scope, members, 'members')], writer, guard, [], explore);
    const call = { source: 'members', measures: ['members'], rows: 1 };
    expect(((await run(tools as Record<string, unknown>, `explore_${view.name}`, call)) as { answer: string }).answer).toMatch(/members/);
    // The suspension lands between handing and execution: the tool that was handed must read nothing when it runs.
    // A rejection is not that: an implementation that read every row and then threw satisfies it the same way, so the
    // reads themselves are spied on.
    await members.update!(['members_4'], { status: 'Suspended' });
    try {
      const spy = { aggregate: vi.fn(aggregate), read: vi.fn((name: string, q: Parameters<typeof read>[1]) => read(name, q)), today: explore.io.today };
      const { tools: again } = assistantTools([await handedTo(scope, members, 'members')], writer, guard, [], { ...explore, io: spy });
      // The refusal is the read layer's own, raised before its cached code runs — a suspended person has no scope, so
      // it is the sign-in one — and that is the property "reads nothing" stands on. A bare `rejects.toBeTruthy()` was
      // satisfied by an implementation that read every row and then threw; the spy on `read` says the rows were never
      // reached, which is the claim the test's name makes.
      await expect(run(again as Record<string, unknown>, `explore_${view.name}`, call)).rejects.toBeInstanceOf(Unauthenticated);
      expect(spy.aggregate).toHaveBeenCalledTimes(1);
      expect(spy.read).not.toHaveBeenCalled();
    } finally {
      await members.update!(['members_4'], { status: 'Active' });
    }
  });

  it('refuses a generic member update that names a role, and writes nothing', async () => {
    jar.value = 'members_1';
    const scope = await resolveAccess();
    const before = (await members.query({ where: [{ field: 'id', op: 'eq', value: 'members_4' }] })).rows[0];
    await expect(membersFor(scope).update!(['members_4'], { role: 'Admin' })).rejects.toThrow('Change roles and add-ons from the Members page.');
    expect((await members.query({ where: [{ field: 'id', op: 'eq', value: 'members_4' }] })).rows[0]).toEqual(before);
  });
});

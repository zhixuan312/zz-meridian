// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { may, resolveAccess } from '@/data/access';
import { ACTIONS, FEATURES } from '@/data/features';
import { members } from '@/data/collections';
import { membersFor } from '@/data/member-mutations';
import { scopedOps, scopedQuery } from '@/lib/assistant/scoped';
import { assistantTools } from '@/lib/assistant/tools';
import { viewTools } from '@/views/tools';

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
    // What the route hands the builder is a collection whose forbidden operations are gone, so no write tool is built
    // for one: the builder only builds what it is given.
    const readOnly = { ...members, create: undefined, update: undefined, remove: undefined };
    const { tools } = assistantTools([readOnly as typeof members], writer, guard);
    expect(Object.keys(tools).filter((n) => /^(create|update|remove)_/.test(n))).toEqual([]);
    expect(Object.keys(tools)).toEqual(['query_members']);
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

  it('hands the assistant only the operations the person may perform', async () => {
    // A Member reads members and writes none: no write tool is built for one, which is FR-17's registration filter.
    jar.value = 'members_4';
    const member = await scopedOps({ ...members }, await resolveAccess(), 'members');
    expect([member.create, member.update, member.remove]).toEqual([undefined, undefined, undefined]);
    expect(Object.keys(assistantTools([member], writer, guard).tools)).toEqual(['query_members']);
    // The Owner keeps them all, and a Key manager keeps only the key operations it has.
    jar.value = 'members_1';
    expect(Object.keys(assistantTools([await scopedOps({ ...members }, await resolveAccess(), 'members')], writer, guard).tools)).toContain('update_members');
    jar.value = 'members_5';
    const keyManager = await scopedOps({ ...members }, await resolveAccess(), 'members');
    expect(keyManager.update).toBeUndefined();
  });

  it('keeps role and addOns out of the agent write schemas', async () => {
    jar.value = 'members_1';
    const { tools } = assistantTools([members], writer, guard);
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).not.toContain('role');
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).not.toContain('addOns');
    expect(setKeys(tools as Record<string, unknown>, 'update_members')).not.toContain('role');
    expect(setKeys(tools as Record<string, unknown>, 'update_members')).not.toContain('addOns');
    // The fields stay readable: a query still sees them.
    expect(shapeKeys(tools as Record<string, unknown>, 'create_members')).toContain('name');
    expect([...(members.pageOnlyFields ?? [])]).toEqual(['role', 'addOns']);
  });

  it('refuses an already-registered query tool once the person has been demoted', async () => {
    jar.value = 'members_4';
    const scope = await resolveAccess();
    const { tools } = assistantTools([scopedQuery(members, scope, 'members')], writer, guard);
    expect((await run(tools as Record<string, unknown>, 'query_members', {})) as unknown).toBeTruthy();
    // The demotion lands between registration and execution: the tool that was listed must refuse at the moment it runs.
    await members.update!(['members_4'], { role: 'Viewer' });
    try {
      await expect(run(tools as Record<string, unknown>, 'query_members', {})).rejects.toBeTruthy();
    } finally {
      await members.update!(['members_4'], { role: 'Member' });
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

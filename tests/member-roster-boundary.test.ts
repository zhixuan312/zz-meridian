// @vitest-environment node
/**
 * The member boundary reads the roster to decide, not the caller: an Owner rule, the last-active-Owner rule and the
 * target lookup all stand on the rows it holds. That read is the *collection's* `query`, which has no default limit —
 * only `read()` normalizes one (`src/data/read.ts`) — so the whole roster is there whatever its size. This holds that
 * door shut: were a page's limit ever applied to the roster, an Admin could change an Owner the boundary never saw.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { members } from '@/data/collections';
import { REFUSALS, assignMemberRole, membersFor } from '@/data/member-mutations';
import { resolveAccess } from '@/data/access';
import type { Member } from '@/data/sample';

const OWNER = 'members_1';
const ADMIN = 'members_2';

type Row = Record<string, unknown>;
function store(): { rows: Row[]; next: number } {
  const key = Symbol.for('zz-meridian.collections');
  const stores = ((globalThis as Record<symbol, unknown>)[key] ??= new Map()) as Map<string, { rows: Row[]; next: number }>;
  return stores.get(JSON.stringify(['demo', 'members']))!;
}
/** The roster's ids in the order a read sorts them: the key ascending, as strings. */
const sortedIds = (): string[] => store().rows.map((r) => String(r.id)).sort();

/**
 * A workspace with more members than one page holds, and an Active Owner past that page. The owner is made from a row
 * the read would never reach, which is the whole point: `sorted[200]` is the 201st member a query with no limit omits.
 */
async function grownWorkspace(): Promise<{ ownerPastPage: string; total: number }> {
  for (let i = store().rows.length; i < 400; i++) {
    await members.create!({
      name: `Person ${i}`, email: `person.${i}@example.com`, role: 'Member', addOns: [],
      team: 'Engineering', status: 'Active', joined: '2025-01-01', lastActive: '2025-01-02',
    });
  }
  const ids = sortedIds();
  const ownerPastPage = ids[200];
  await members.update!([ownerPastPage], { role: 'Owner', status: 'Active' });
  return { ownerPastPage, total: ids.length };
}

beforeEach(() => { jar.value = OWNER; });

describe('the member boundary on a roster larger than a read', () => {
  it('refuses an Admin the change of an Owner the roster holds past the first page', async () => {
    const { ownerPastPage, total } = await grownWorkspace();
    expect(total).toBeGreaterThan(200);
    expect(sortedIds().indexOf(ownerPastPage)).toBe(200);
    jar.value = ADMIN;
    const scope = await resolveAccess();
    // A change to an Owner is an Owner's to make. The boundary reads the roster to know it is one, and the row is the
    // 201st: a first page of 100 does not hold it, so the rule never fires and the write goes through.
    await expect(membersFor(scope).update!([ownerPastPage], { status: 'Suspended' })).rejects.toThrow(REFUSALS.changeOwner);
    expect((await members.query({ where: [{ field: 'id', op: 'eq', value: ownerPastPage }] })).rows[0]!.status).toBe('Active');
  });

  it('finds a member the first page does not hold rather than reporting there is no such member', async () => {
    const { ownerPastPage } = await grownWorkspace();
    const target = (await members.query({ where: [{ field: 'id', op: 'eq', value: ownerPastPage }] })).rows[0] as Member;
    // The role it already has: the boundary has nothing to write and says so by writing nothing. Before, it could not
    // find the row at all and refused with "No members with id …" for a member standing right there.
    await expect(assignMemberRole({ id: target.id, role: 'Owner', addOns: target.addOns })).resolves.toBeUndefined();
  });
});

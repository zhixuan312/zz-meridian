/**
 * The member boundary: the one place every member create, update and remove passes, so the Owner, self and
 * last-active-Owner rules hold for a page action, the assistant and an adopter's MCP server alike.
 *
 * It never takes a caller: it re-resolves one from the request's own scope, reads the roster again, checks the
 * operation's grant, and refuses with a frozen message before anything is written. An assignment reads the whole
 * membership as it would be *after* the change and requires at least one member who is both Owner and Active. Every
 * write runs inside one promise queue per workspace, so two concurrent changes cannot both pass on a stale count.
 * Only after a step commits does it invalidate the members tag (and the Activity tag, when it wrote a line); a
 * refusal writes nothing, emits nothing and invalidates nothing.
 *
 * The policy and the tag helper are loaded on demand (`currentScope`, `tag`): a static import of `src/data/access` or
 * `src/data/read` would close a cycle, because the demo policy binds `members` through this module. A product replaces
 * the queue with a database transaction; the adopter guide says so.
 */
import { updateTag } from 'next/cache';
import { activity, clock, members } from '@/data/collections';
import { ADD_ONS, effective, MAIN_ROLES, roleLabel, type AddOn, type MainRole } from '@/data/roles';
import type { AnyCollection, Grant } from '@/lib/collection';
import type { Member } from '@/data/sample';
import type { AccessScope } from '@/data/access';

/** Every refusal the boundary produces, in the frozen order the spec checks. */
export const REFUSALS = {
  signIn: 'Sign in again to make this change.',
  noGrant: 'You do not have permission to make this change.',
  values: 'Choose a role and add-ons from the lists.',
  generic: 'Change roles and add-ons from the Members page.',
  ownRole: 'You cannot change your own role.',
  ownStatus: 'You cannot suspend or remove yourself.',
  giveOwner: 'Only an Owner can give or take away the Owner role.',
  changeOwner: 'Only an Owner can change or remove an Owner.',
  lastOwner: 'The workspace needs at least one active Owner.',
} as const;

/** What a member row offers the caller reading it, and why an action is hidden. */
export type MemberRowAccess = {
  changeRole: boolean;
  suspend: boolean;
  reactivate: boolean;
  remove: boolean;
  /** The role choices this caller may assign to this member, and the add-ons it may add. */
  roles: readonly MainRole[];
  addOns: readonly AddOn[];
  /** Why a row action is hidden, when the reason is the target's rather than a missing grant. */
  reason?: string;
};

/** A boundary refusal: its message is the frozen one, and it is thrown so a page turns it into a reason. */
class MemberRefusal extends Error {}

const policy = () => (load.policy ??= import('@/data/access'));
const tagOf = () => (load.tag ??= import('@/data/read'));
const load: { policy?: Promise<typeof import('@/data/access')>; tag?: Promise<typeof import('@/data/read')> } = {};

/** The request's own scope, re-resolved on every write and read: null when no Active person is signed in. */
async function currentScope(): Promise<AccessScope | null> {
  const { resolveAccess } = await policy();
  return resolveAccess().catch(() => null);
}

/** The tenant collection's tag, built by the one place that owns it (`src/data/read`). */
async function tag(tenantId: string, name: string): Promise<string> {
  const { collectionTag } = await tagOf();
  return collectionTag(tenantId, name);
}

/** The roles a caller may assign: an Owner every main role, an Admin everything but Owner, anyone else none. */
function assignableRoles(grants: ReadonlySet<Grant>): readonly MainRole[] {
  if (grants.has('workspace:update')) return MAIN_ROLES;
  if (grants.has('members:update')) return MAIN_ROLES.filter((role) => role !== 'Owner');
  return [];
}

/** A member re-read from the roster, or null when there is no such record. */
async function memberById(id: string): Promise<Member | null> {
  return (await members.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0] ?? null;
}

/**
 * The caller, re-resolved from the request's own scope and re-read from the roster, or a refusal when there is no
 * signed-in Active person. Every step calls it, so a suspension or a sign-out takes effect at the next write.
 */
async function callerOrThrow(): Promise<{ member: Member; grants: ReadonlySet<Grant> }> {
  const scope = await currentScope();
  const member = scope ? await memberById(scope.subjectId) : null;
  if (!member || member.status !== 'Active') throw new MemberRefusal(REFUSALS.signIn);
  return { member, grants: effective(member.role, member.addOns) };
}

/** One promise queue per workspace, on globalThis so a route handler, a server action and a page share it. */
const QUEUES = Symbol.for('zz-meridian.member-writes');
const queues = () => ((globalThis as Record<symbol, unknown>)[QUEUES] ??= new Map<string, Promise<unknown>>()) as Map<string, Promise<unknown>>;
function enqueue<T>(tenantId: string, step: () => Promise<T>): Promise<T> {
  const tail = queues().get(tenantId) ?? Promise.resolve();
  const run = tail.then(step, step);
  // The queue holds a settled copy, so a refused step never leaves an unhandled rejection behind it.
  queues().set(tenantId, run.then(() => undefined, () => undefined));
  return run;
}

/** The members collection, bound to a scope: its create, update and remove pass the boundary, its reads do not. */
export function membersFor(scope: AccessScope): AnyCollection {
  return {
    ...members,
    create: (input: Record<string, unknown>) => enqueue(scope.tenantId, () => createStep(scope, input)),
    update: (ids: string[], patch: Record<string, unknown>) => enqueue(scope.tenantId, () => updateStep(scope, ids, patch)),
    remove: (ids: string[]) => enqueue(scope.tenantId, () => removeStep(scope, ids)),
  };
}

/** A create: the grant, the role and add-ons the caller names, and giving Owner only with `workspace:update`. */
async function createStep(scope: AccessScope, input: Record<string, unknown>): Promise<Member> {
  const { grants } = await callerOrThrow();
  if (!grants.has('members:create')) throw new MemberRefusal(REFUSALS.noGrant);
  if (input.role !== undefined && !(MAIN_ROLES as readonly unknown[]).includes(input.role)) throw new MemberRefusal(REFUSALS.values);
  if (input.addOns !== undefined && (!Array.isArray(input.addOns) || input.addOns.some((addOn) => !(ADD_ONS as readonly unknown[]).includes(addOn)))) throw new MemberRefusal(REFUSALS.values);
  if (input.role === 'Owner' && !grants.has('workspace:update')) throw new MemberRefusal(REFUSALS.giveOwner);
  const row = await members.create!(input);
  updateTag(await tag(scope.tenantId, 'members'));
  return row;
}

/**
 * A generic update: the grant, the self rule, the Owner rule and the membership after the change. A change that names
 * `role` or `addOns` is refused — those go through the Members page's assignment path — and every target is checked
 * before any of them is written, so a batch is all or nothing: a status change that would take the caller's own access,
 * and any change after which no member is both Owner and Active, are refused whole.
 */
async function updateStep(scope: AccessScope, ids: string[], patch: Record<string, unknown>): Promise<Member[]> {
  const { member, grants } = await callerOrThrow();
  if (!grants.has('members:update')) throw new MemberRefusal(REFUSALS.noGrant);
  if ('role' in patch || 'addOns' in patch) throw new MemberRefusal(REFUSALS.generic);
  if (patch.status !== undefined && patch.status !== 'Active' && ids.includes(member.id)) throw new MemberRefusal(REFUSALS.ownStatus);
  const rows = (await members.query({})).rows;
  if (!grants.has('workspace:update') && ids.some((id) => rows.find((m) => m.id === id)?.role === 'Owner')) throw new MemberRefusal(REFUSALS.changeOwner);
  const after = patch.status === undefined ? rows : rows.map((m) => (ids.includes(m.id) ? { ...m, status: patch.status as Member['status'] } : m));
  if (!after.some((m) => m.role === 'Owner' && m.status === 'Active')) throw new MemberRefusal(REFUSALS.lastOwner);
  const out = await members.update!(ids, patch);
  updateTag(await tag(scope.tenantId, 'members'));
  return out;
}

/** A removal: the grant, the self and Owner rules, and the membership after it must keep an active Owner. */
async function removeStep(scope: AccessScope, ids: string[]): Promise<number> {
  const { member, grants } = await callerOrThrow();
  if (!grants.has('members:remove')) throw new MemberRefusal(REFUSALS.noGrant);
  if (ids.includes(member.id)) throw new MemberRefusal(REFUSALS.ownStatus);
  const rows = (await members.query({})).rows;
  if (!grants.has('workspace:update') && ids.some((id) => rows.find((m) => m.id === id)?.role === 'Owner')) throw new MemberRefusal(REFUSALS.changeOwner);
  const after = rows.filter((m) => !ids.includes(m.id));
  if (!after.some((m) => m.role === 'Owner' && m.status === 'Active')) throw new MemberRefusal(REFUSALS.lastOwner);
  const removed = await members.remove!(ids);
  updateTag(await tag(scope.tenantId, 'members'));
  return removed;
}

/**
 * What one member row offers the caller reading it, from the same rules the boundary enforces: the three action
 * capabilities, the role and add-on choices for this member, and — when the reason is the target's, not a missing
 * grant — the first firing rule's message, in the frozen order.
 */
export async function memberAccess(id: string): Promise<MemberRowAccess> {
  const scope = await currentScope();
  const caller = scope ? await memberById(scope.subjectId) : null;
  const active = caller !== null && caller.status === 'Active';
  const grants: ReadonlySet<Grant> = active ? effective(caller.role, caller.addOns) : new Set<Grant>();
  const mayUpdate = grants.has('members:update');
  const mayRemove = grants.has('members:remove');
  const owns = grants.has('workspace:update');
  const self = active && caller.id === id;
  const target = await memberById(id);
  const ownerTarget = target?.role === 'Owner';
  const blocked = ownerTarget && !owns;
  const changeRole = mayUpdate && target !== null && !self && !blocked;
  return {
    changeRole,
    suspend: changeRole && target.status === 'Active',
    reactivate: changeRole && target.status === 'Suspended',
    remove: mayRemove && target !== null && !self && !blocked,
    roles: changeRole ? assignableRoles(grants) : [],
    addOns: changeRole ? ADD_ONS : [],
    reason: !active
      ? undefined
      : mayUpdate && self ? REFUSALS.ownRole
        : (mayUpdate || mayRemove) && self ? REFUSALS.ownStatus
          : (mayUpdate || mayRemove) && blocked ? REFUSALS.changeOwner
            : undefined,
  };
}

/** The main roles the caller may put on an invitation: an Owner every one, an Admin everything but Owner. */
export async function invitableRoles(): Promise<readonly MainRole[]> {
  const scope = await currentScope();
  const caller = scope ? await memberById(scope.subjectId) : null;
  if (!caller || caller.status !== 'Active') return [];
  return assignableRoles(effective(caller.role, caller.addOns));
}

/** The same add-ons as a set: a repeated add-on, in any order, is the same membership. */
function sameAddOns(a: readonly AddOn[], b: readonly AddOn[]): boolean {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((x, i) => x === right[i]);
}

/**
 * Assign a role and its add-ons to one member, through the boundary: the grant, the values, the self, Owner and
 * last-active-Owner rules, then the change and exactly one Activity line, in one queued step. A repeat (the same
 * role and add-ons, compared as a set) changes nothing and writes no line.
 */
export async function assignMemberRole(input: { id: string; role: MainRole; addOns: AddOn[] }): Promise<void> {
  const scope = await currentScope();
  if (!scope) throw new MemberRefusal(REFUSALS.signIn);
  return enqueue(scope.tenantId, async () => {
    const { member: caller, grants } = await callerOrThrow();
    if (!grants.has('members:update')) throw new MemberRefusal(REFUSALS.noGrant);
    if (!(MAIN_ROLES as readonly unknown[]).includes(input.role) || !Array.isArray(input.addOns) || input.addOns.some((addOn) => !(ADD_ONS as readonly unknown[]).includes(addOn))) {
      throw new MemberRefusal(REFUSALS.values);
    }
    const addOns = [...new Set(input.addOns)];
    if (input.id === caller.id) throw new MemberRefusal(REFUSALS.ownRole);
    const rows = (await members.query({})).rows;
    const target = rows.find((m) => m.id === input.id);
    if (!target) throw new MemberRefusal(`No members with id ${input.id}`);
    const owns = grants.has('workspace:update');
    if (input.role === 'Owner' && !owns) throw new MemberRefusal(REFUSALS.giveOwner);
    if (target.role === 'Owner' && !owns) throw new MemberRefusal(REFUSALS.changeOwner);
    if (target.role === input.role && sameAddOns(target.addOns, addOns)) return;
    const after = rows.map((m) => (m.id === input.id ? { ...m, role: input.role, addOns } : m));
    if (!after.some((m) => m.role === 'Owner' && m.status === 'Active')) throw new MemberRefusal(REFUSALS.lastOwner);
    await members.update!([input.id], { role: input.role, addOns });
    await activity.create!({
      at: clock().toISOString(),
      actor: caller.name,
      verb: 'changed',
      object: `${target.name}'s role to ${roleLabel({ role: input.role, addOns })}`,
    });
    updateTag(await tag(scope.tenantId, 'members'));
    updateTag(await tag(scope.tenantId, 'activity'));
  });
}

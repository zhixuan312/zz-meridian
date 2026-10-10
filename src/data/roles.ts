/**
 * The workspace's roles and what each may do: the frozen role table, and the one place a role name or a grant is
 * written. A product replaces the table below with its own; the members collection validates `role` and `addOns`
 * against these lists, and a policy asks `whoCan` which roles satisfy a need.
 *
 * A member has one main role and any number of add-ons. Their effective grants are the union of the two (`effective`):
 * there is no wildcard and no deny, so a grant is never taken away by another role.
 */
import type { Grant, ProtectedNeed } from '@/lib/collection';

/** The role every member has, in table order: Owner first, and an add-on name never appears here. */
export const MAIN_ROLES = ['Owner', 'Admin', 'Member', 'Viewer'] as const;
/** Grants a member carries on top of their main role. */
export const ADD_ONS = ['Key manager'] as const;

export type MainRole = (typeof MAIN_ROLES)[number];
export type AddOn = (typeof ADD_ONS)[number];

/** Reading every dashboard is one grant per dashboard, so the four roles that see the console share this list. */
const DASHBOARDS: readonly Grant[] = ['requests:read', 'days:read', 'endpoints:read', 'responses:read', 'services:read', 'incidents:read', 'customers:read', 'activity:read'];

/** Each role's own grants, and only its own: a member's add-ons are unioned in by `effective`, never written here. */
export const GRANTS: Record<MainRole | AddOn, readonly Grant[]> = {
  Owner: [
    ...DASHBOARDS, 'requests:create', 'keys:read', 'keys:create', 'keys:remove', 'members:read', 'members:create', 'members:update', 'members:remove', 'activity:create', 'workspace:read', 'workspace:update', 'workspace:remove',
  ],
  Admin: [
    ...DASHBOARDS, 'requests:create', 'keys:read', 'keys:create', 'keys:remove', 'members:read', 'members:create', 'members:update', 'members:remove', 'activity:create', 'workspace:read',
  ],
  Member: [...DASHBOARDS, 'requests:create', 'keys:read', 'members:read', 'activity:create'],
  Viewer: [...DASHBOARDS],
  'Key manager': ['keys:read', 'keys:create', 'keys:remove', 'activity:create'],
};

/** Everything a member may do: their main role's grants, plus every add-on's. A repeated add-on changes nothing. */
export function effective(role: MainRole, addOns: readonly AddOn[]): ReadonlySet<Grant> {
  const grants = new Set<Grant>(GRANTS[role]);
  for (const addOn of addOns) for (const grant of GRANTS[addOn]) grants.add(grant);
  return grants;
}

/** The roles whose own grants satisfy all of `need`, main roles first and add-ons after, each in table order. */
export function whoCan(need: ProtectedNeed): (MainRole | AddOn)[] {
  const grants = typeof need === 'string' ? [need] : need.allOf;
  return [...MAIN_ROLES, ...ADD_ONS].filter((role) => grants.every((grant) => GRANTS[role].includes(grant)));
}

/**
 * How a member reads wherever a role is named: their main role, then their add-ons. Add-ons are taken in the table's
 * declared order, so two members with the same roles read the same way, and a repeated add-on still reads once.
 */
export function roleLabel(member: { role: MainRole; addOns: readonly AddOn[] }): string {
  return [member.role, ...ADD_ONS.filter((addOn) => member.addOns.includes(addOn))].join(' + ');
}

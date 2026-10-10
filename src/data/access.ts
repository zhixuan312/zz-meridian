/**
 * Who the current request is and what they may do: the one place a page, a server action and the assistant ask. It also
 * answers the console's chrome (`chromeAccess`), which reads the same scope once more, for what the rail draws.
 *
 * This is the demo policy. It signs the request in as the sample member the `zz_meridian_view_as` cookie names, or as
 * Maya Chen (`members_1`) when there is no cookie, and answers `allows` from that member's record: the roster is read
 * again on every call, so a role change or a suspension takes effect at the next operation, and there is never a
 * fallback to the Owner or to anyone else. The grants come from the role table (`effective`), limited to the
 * operations each collection supports. A cookie naming an unknown or non-Active member gives no session, so
 * `resolveAccess` throws `Unauthenticated`.
 *
 * A product replaces this policy: `current` reads its own session (null when there is none), `bind` returns the
 * collection of that tenant with its database predicate already applied, and `allows` says what the scope may do with
 * each collection. `authorizationKey` must change whenever what the scope may see changes, because the cached read
 * keys on it.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { nav } from '@/app.config';
import { activity, days, endpoints, incidents, keys, members, requests, responses, services } from '@/data/collections';
import { FEATURES, type FeatureId } from '@/data/features';
import { effective, roleLabel, type AddOn, type MainRole } from '@/data/roles';
import { chooseViewAs } from '@/data/view-as';
import { NoAccess } from '@/views/no-access';
import type { Member } from '@/data/sample';
import type { AnyCollection, Grant, Need } from '@/lib/collection';

export type AccessScope = Readonly<{
  tenantId: string;
  subjectId: string;
  authorizationKey: string;
}>;

type Operation = 'read' | 'create' | 'update' | 'remove';

type Policy = {
  /** The current request's scope, or null when no session can be established. */
  current: () => Promise<AccessScope | null>;
  /** The scope's own collection by name, or undefined when there is none. */
  bind: (scope: AccessScope, name: string) => AnyCollection | undefined;
  /** What the scope may do with a collection; `ids` are the records an update or a removal touches. */
  allows: (scope: AccessScope, name: string, op: Operation, ids?: string[]) => Promise<boolean>;
  /** The person's name as Activity shows it ("Assistant … · for Maya Chen"); optional, and kept out of the scope, which keys the cache. */
  name?: (scope: AccessScope) => Promise<string | null>;
};

export class Unauthenticated extends Error {
  constructor() {
    super('Sign in to continue.');
    this.name = 'Unauthenticated';
  }
}

/** One message for a collection that does not exist and one the scope may not use, so neither is disclosed. */
export class AccessDenied extends Error {
  constructor() {
    super('You do not have access to that.');
    this.name = 'AccessDenied';
  }
}

/** The sample's one tenant. */
const TENANT = 'demo';
/** The member the demo is signed in as when no `zz_meridian_view_as` cookie is set. */
const DEFAULT_MEMBER = 'members_1';

/** The cookie that names who the demo is signed in as; written by the View as action. */
export const VIEW_AS_COOKIE = 'zz_meridian_view_as';

/** The five frozen personas in the spec's order: the sample people the demo signs in as. */
export const PERSONAS = ['members_1', 'members_2', 'members_4', 'members_5', 'members_12'] as const;

/** The one place the scope key is built: the tenant, the member, their role and their add-ons deduped and sorted. */
function authorizationKeyOf(member: { id: string; role: MainRole; addOns: readonly AddOn[] }): string {
  return `${TENANT}:${member.id}:${member.role}:${[...new Set(member.addOns)].sort().join('+')}`;
}

function accessFrom(policy: Policy) {
  async function resolveAccess(): Promise<AccessScope> {
    const scope = await policy.current();
    if (!scope) throw new Unauthenticated();
    return scope;
  }
  function collectionFor(scope: AccessScope, name: string): AnyCollection {
    const c = policy.bind(scope, name);
    if (!c) throw new AccessDenied();
    return c;
  }
  async function can(scope: AccessScope, name: string, op: Operation, ids?: string[]): Promise<boolean> {
    return policy.bind(scope, name) !== undefined && policy.allows(scope, name, op, ids);
  }
  /** The person's name for a record of what an agent did for them, or null when the policy does not say. */
  async function nameOf(scope: AccessScope): Promise<string | null> {
    return (await policy.name?.(scope)) ?? null;
  }
  return { resolveAccess, collectionFor, can, nameOf };
}

/** The member a scope names, re-read from the roster every call; null when there is no such record. */
async function memberById(id: string): Promise<Member | null> {
  return (await members.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0] ?? null;
}

/** The member the demo is signed in as: the cookie's id, or Maya Chen, and only while that record is Active. */
async function currentMember(): Promise<Member | null> {
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? DEFAULT_MEMBER;
  const member = await memberById(id);
  return member && member.status === 'Active' ? member : null;
}

/** The sample's one tenant: each collection it has, and which operations it supports. */
const DEMO_COLLECTIONS: Record<string, { collection: AnyCollection; ops: readonly Operation[] }> = {
  members: { collection: members, ops: ['read', 'create', 'update', 'remove'] },
  keys: { collection: keys, ops: ['read', 'create', 'remove'] },
  requests: { collection: requests, ops: ['read', 'create'] },
  days: { collection: days, ops: ['read'] },
  endpoints: { collection: endpoints, ops: ['read'] },
  responses: { collection: responses, ops: ['read'] },
  services: { collection: services, ops: ['read'] },
  incidents: { collection: incidents, ops: ['read'] },
  activity: { collection: activity, ops: ['read', 'create'] },
};

export const { resolveAccess, collectionFor, can, nameOf } = accessFrom({
  current: async () => {
    const member = await currentMember();
    return member ? { tenantId: TENANT, subjectId: member.id, authorizationKey: authorizationKeyOf(member) } : null;
  },
  bind: (scope, name) => (scope.tenantId === TENANT ? DEMO_COLLECTIONS[name]?.collection : undefined),
  allows: async (scope, name, op, ids) => {
    const member = await memberById(scope.subjectId);
    if (!member || member.status !== 'Active') return false;
    const grants = effective(member.role, member.addOns);
    if (!grants.has(`${name}:${op}` as Grant)) return false;
    const supported = DEMO_COLLECTIONS[name];
    if (!supported || (op !== 'read' && !supported.ops.includes(op))) return false;
    // A member who is an Owner is only changed by someone who may change the workspace.
    if (name === 'members' && (op === 'update' || op === 'remove')) {
      const targets = await Promise.all((ids ?? []).map((id) => memberById(id)));
      if (targets.some((t) => t?.role === 'Owner') && !grants.has('workspace:update')) return false;
    }
    return true;
  },
  name: async (scope) => (await memberById(scope.subjectId))?.name ?? null,
});

/**
 * Whether a member satisfies a need: `public` is any signed-in Active person, which `resolveAccess` has already
 * proved; a grant is asked of the role table (`effective`, main role and add-ons unioned), an `allOf` of every grant.
 *
 * The question is the role's, not the collection's. A grant a role carries is what that person may do, and whether a
 * collection of that name is bound — `can` — is a question about the data behind it. `customers:read` is every viewer's
 * grant and the Customers page reads a fixture rather than a collection, so the rail asks `effective` for it.
 */
function satisfies(member: Member, need: Need): boolean {
  if (member.status !== 'Active') return false;
  if (need === 'public') return true;
  const grants = effective(member.role, member.addOns);
  return typeof need === 'string' ? grants.has(need) : need.allOf.every((grant) => grants.has(grant));
}

/**
 * What the current request may do, asked the one way a page, a control or the rail asks it: `public` is satisfied by
 * any signed-in Active person, a grant by the role table, and an `allOf` by every grant of it.
 *
 * Rejects `Unauthenticated` when there is no session, which is the caller's to catch: this answers about a person, not
 * for one. A page does not catch it — it opens with `gate`, which sends the request to sign-in or renders NoAccess
 * before the page's own read.
 */
export async function may(need: Need): Promise<boolean> {
  const scope = await resolveAccess();
  const member = await memberById(scope.subjectId);
  if (!member) throw new Unauthenticated();
  return satisfies(member, need);
}

/** What a page or a view tool calls before it reads: `may` asked one way, refused as the one `AccessDenied` message. */
export async function requireNeed(need: Need): Promise<void> {
  if (!(await may(need))) throw new AccessDenied();
}

/**
 * The one page gate, called as every dashboard page's first statement so the check is what stops the read, never the
 * rail: `chromeAccess().only` hides a destination but forbids nothing, so a page that leaned on it would show a person
 * the records the rail merely left unlinked.
 *
 * It asks the same `requireNeed` a view tool asks, so a page and a tool refuse alike. A request with no session is sent
 * to sign-in. A person who may not use the feature gets the NoAccess view as a normal 200 answer — awaited, because the
 * view is an async server component and a page hands a renderer an element, not a promise. `null` means the feature is
 * held and the page may render and read.
 */
export async function gate(feature: FeatureId): Promise<JSX.Element | null> {
  try {
    await requireNeed(FEATURES[feature].needs);
  } catch (error) {
    if (error instanceof Unauthenticated) redirect('/sign-in');
    if (error instanceof AccessDenied) return await NoAccess({ feature });
    throw error;
  }
  return null;
}

/** What the console's chrome shows about the current request: the destinations, the person, and who the demo may be viewed as. */
export type ChromeAccess = {
  /** The destinations this person may satisfy the need of, as hrefs — what the rail and the palette both draw. */
  only: string[];
  /** The signed-in person, as the rail's account card reads them: their name and `roleLabel`. */
  user: { name: string; role: string };
  /** The View as group: the persona in view, the five personas in order, and the action that signs the demo in as one. */
  viewAs: {
    current: string;
    options: { id: string; label: string; disabled?: boolean }[];
    choose: (id: string) => Promise<void>;
  };
};

/**
 * Who the console is being read by, for the rail and the command palette, resolved behind the frame the layout streams.
 *
 * A product replaces this with its own session's person; the shape never changes, so the chrome never learns a product's
 * sign-in. The personas are read again on every call, so a suspension takes effect at the next request, and a persona
 * whose record is not Active is listed but not selectable — never dropped, so the list never shifts under the pointer.
 * With no session this rejects `Unauthenticated`, and the chrome keeps its placeholder rather than naming anyone.
 *
 * `only` is the nav's own destinations whose `needs` this person satisfies. It is what the rail and the palette draw,
 * and it is presentation only: hiding a destination is not the gate, which a later task puts on every page itself.
 */
export async function chromeAccess(): Promise<ChromeAccess> {
  const scope = await resolveAccess();
  const member = await memberById(scope.subjectId);
  if (!member) throw new Unauthenticated();
  const personas = new Map(
    (await members.query({ where: [{ field: 'id', op: 'in', value: [...PERSONAS] }] })).rows.map((m) => [m.id, m]),
  );
  const items = nav.flatMap((g) => g.items);
  return {
    only: items.filter((i) => satisfies(member, i.needs)).map((i) => i.href),
    user: { name: member.name, role: roleLabel(member) },
    viewAs: {
      current: member.id,
      options: PERSONAS.map((id) => ({ id, label: personas.get(id)?.name ?? id, disabled: personas.get(id)?.status !== 'Active' })),
      choose: chooseViewAs,
    },
  };
}

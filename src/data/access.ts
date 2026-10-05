/**
 * Who the current request is and what they may do: the one place a page, a server action and the assistant ask.
 *
 * The sample has a single owner of a single tenant, so `policy` answers the same way for everyone. A product replaces
 * `policy`: `current` reads its session (null when there is none), `bind` returns the collection of that tenant with its
 * database predicate already applied, and `allows` says what the scope may do with each collection. `authorizationKey`
 * must change whenever what the scope may see changes, because the cached read keys on it.
 */
import { keys, members, requests } from '@/data/collections';
import type { AnyCollection } from '@/lib/collection';

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
  return { resolveAccess, collectionFor, can };
}

const DEMO: AccessScope = { tenantId: 'demo', subjectId: 'owner', authorizationKey: 'demo:1' };
/** The sample's one tenant: each collection it has, and what its owner may do with it. */
const DEMO_COLLECTIONS: Record<string, { collection: AnyCollection; ops: readonly Operation[] }> = {
  members: { collection: members, ops: ['read', 'create', 'update', 'remove'] },
  keys: { collection: keys, ops: ['read', 'create', 'remove'] },
  requests: { collection: requests, ops: ['read'] },
};

export const { resolveAccess, collectionFor, can } = accessFrom({
  current: async () => DEMO,
  bind: (scope, name) => (scope.tenantId === DEMO.tenantId ? DEMO_COLLECTIONS[name]?.collection : undefined),
  allows: async (_scope, name, op) => DEMO_COLLECTIONS[name]?.ops.includes(op) ?? false,
});

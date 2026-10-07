# Cache Components, scoped reads and writes

This is the route a product takes from a console that renders every request to one whose shell prerenders, whose pages
read through an authorized and cached `read()`, and whose writes drop exactly their tenant's collection. Every
migration `update` reports for 0.5.0 names a section below. `live.md` carries the live stream and its
refresh.

The starters are the template's own files. A product keeps their shape and replaces the policy, the session and the
database predicates with its own. Copy a starter whole, then change only what the section says is yours to change.

## Turn Cache Components on

Set both flags in the Next config (`optional:next.config.ts`):

```ts
const config: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};
```

Every route that is not an API route must then be static or partial. A route that reads the request, the clock or an
uncached source puts that part inside a `Suspense` boundary of its own, so the rest of the route prerenders and the
boundary streams in. A page or layout that `await`s `connection()` at its top opts the whole route out of prerendering;
remove that and read the request-dependent data behind a boundary. A promise built from `connection()`, such as
`connection().then(() => ...)`, that a component resolves behind a boundary is how the shell reads the environment
without blocking the frame. `node scripts/route-policy.ts` classifies every route of a production build and fails a
route that is neither static nor partial, unless `optional:scripts/verify.config.ts` lists it in `requestDependentRoutes` with a
reason. Give each console route its own `loading.tsx`, shaped like the page, so a navigation shows its own skeleton.

## The shell's assistant promise

`AppShell`'s `assistant` prop is a `Promise<boolean>`, and `useAssistantAvailable()` returns that promise. The layout
hands the shell a promise and does not await it:

```ts
const assistant = connection().then(() => assistantConfig(process.env) !== null);
```

Read the promise with `use()` inside a small `Suspense` boundary that keeps the control's space:

```tsx
function AssistantSection() {
  const available = use(useAssistantAvailable());
  if (!available) return null;
  return <AssistantSettings />;
}
```

The launcher keeps its place, inert and hidden from assistive technology, until the promise resolves `true`, so
resolving never moves the row. An unavailable assistant is never a clickable dead control.

## The clock is the data's

`formatRelative(input, now)`, `Freshness`, `ShellTools` and `AlertsPanel` take a required `now`: the data's clock, which is
the `observedAt` a `read()` returned, or `clock()` from `optional:src/data/collections.ts`. None of them reads the
browser's clock, so a prerendered page and its hydration agree. Pass `now={observedAt}` to `<Freshness>` and
`formatRelative(at, observedAt)` in a view; a view that formats times takes `now` as a prop from its page.

## Authorized, scoped reads

A page calls `read(name, query)` and never `collection.query()`. `read()` resolves the caller itself, so no caller can
choose a tenant. It refuses a collection the caller may not read before any cached code runs, and the cached function
it calls sees only the whole `AccessScope`, the collection's name and the normalized query, never a mutable collection.

The profile is `{ stale: 30, revalidate: 60, expire: 3600 }`. The tag is `collection:<sha256 of canonical [tenantId,
collectionName]>`: bounded, deterministic and free of any raw identifier. The real cache key still includes the subject
and the authorization identity, because the cached function's arguments include the whole scope. `authorizationKey`
must change whenever what the scope may see changes; derive it on the server from current permissions or a trusted
authorization revision. If an adapter cannot supply a stable, correct visibility identity, leave its read uncached
until it can.

`optional:src/data/access.ts` builds `resolveAccess`, `collectionFor` and `can` from one policy. The sample binds a
single scope. A product replaces `policy.current` with its session (null when there is none), `policy.bind` with the
collection of that tenant with its database predicate already applied, and `policy.allows` with its permission check.
A production adapter binds the predicate and the subscription filter; prepending a cache key is not isolation.

```ts
/**
 * Who the current request is and what they may do: the one place a page, a server action and the assistant ask.
 *
 * The sample has a single owner of a single tenant, so `policy` answers the same way for everyone. A product replaces
 * `policy`: `current` reads its session (null when there is none), `bind` returns the collection of that tenant with its
 * database predicate already applied, and `allows` says what the scope may do with each collection. `authorizationKey`
 * must change whenever what the scope may see changes, because the cached read keys on it.
 */
import { activity, days, endpoints, incidents, keys, members, requests, responses, services } from '@/data/collections';
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
  requests: { collection: requests, ops: ['read', 'create'] },
  days: { collection: days, ops: ['read'] },
  endpoints: { collection: endpoints, ops: ['read'] },
  responses: { collection: responses, ops: ['read'] },
  services: { collection: services, ops: ['read'] },
  incidents: { collection: incidents, ops: ['read'] },
  activity: { collection: activity, ops: ['read', 'create'] },
};

export const { resolveAccess, collectionFor, can } = accessFrom({
  current: async () => DEMO,
  bind: (scope, name) => (scope.tenantId === DEMO.tenantId ? DEMO_COLLECTIONS[name]?.collection : undefined),
  allows: async (_scope, name, op) => DEMO_COLLECTIONS[name]?.ops.includes(op) ?? false,
});
```

`optional:src/data/read.ts` is the cached read and the tag helper:

```ts
/**
 * The pages' read: authorized, scoped and cached. A page calls `read()`; it cannot choose a tenant, and the cached
 * helper below sees only the whole scope, the collection's name and the normalized query. A write calls
 * `updateTag(collectionTag(tenantId, name))` after it commits, which drops every user's cached variants of that
 * collection and nobody else's.
 */
import { createHash } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { normalizeQuery, type Query } from '@/lib/collection';
import { AccessDenied, collectionFor, can, resolveAccess, type AccessScope } from '@/data/access';
import { clock } from '@/data/collections';

/** `collection:` and the SHA-256 of the tenant and the name: bounded, deterministic and free of any raw identifier. */
export const collectionTag = (tenantId: string, name: string): string =>
  `collection:${createHash('sha256').update(JSON.stringify([tenantId, name])).digest('hex')}`;

async function cachedRead(scope: AccessScope, name: string, query: Query) {
  'use cache';
  cacheTag(collectionTag(scope.tenantId, name));
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const { rows, total } = await collectionFor(scope, name).query(query);
  return { rows, total, observedAt: clock().toISOString() };
}

/** The rows of a collection the caller may read, with the time the read actually ran. Throws before any cached code runs when it may not. */
export async function read(name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; total: number; observedAt: string }> {
  const scope = await resolveAccess();
  if (!(await can(scope, name, 'read'))) throw new AccessDenied();
  return cachedRead(scope, name, normalizeQuery(collectionFor(scope, name), q));
}
```

`normalizeQuery` (in `optional:src/lib/collection.ts`, Meridian's) defaults and caps the limit and offset, rejects an
unknown field or operator, and sorts by the collection's key last. A caller cannot supply or remove an authorization
predicate through `where`: the predicate belongs to the bound collection.

A page moves like this:

```tsx
// before
const { rows } = await members.query({ sort: { field: 'joined', dir: 'desc' } });
// after
const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
```

Format every freshness against `observedAt`, which is the time the read actually ran and not the render's.

## Writes authorize, then invalidate

A Server Action authorizes the operation and every record it touches, writes through the caller's own collection, and
only after the commit drops the tenant's cached reads with `updateTag`. A refused change writes nothing, emits nothing
and invalidates nothing. Never call `updateTag` before the write has committed, and never write through a collection
that is not bound to the caller's scope. A Route Handler has no `updateTag`; it calls `revalidateTag(tag, { expire: 0 })`.

```ts
'use server';

import { updateTag } from 'next/cache';
import { can, collectionFor, resolveAccess } from '@/data/access';
import { collectionTag } from '@/data/read';

export async function removeMember(id: string) {
  const scope = await resolveAccess();
  if (!(await can(scope, 'members', 'remove', [id]))) return { ok: false, error: 'You do not have permission to make this change.' };
  await collectionFor(scope, 'members').remove!([id]);
  updateTag(collectionTag(scope.tenantId, 'members'));
  return { ok: true };
}
```

Do not use the profile `'max'` on a writer path: it is the profile of a read.

## The assistant route

`optional:app/api/assistant/route.ts` resolves access before the model is reached: 401 without a session. It hands the
assistant only the caller's own collections that the caller may read. Each approved create, update or remove asks a
guard, with the records it touches, at the moment it runs, and a permission revoked since the approval refuses it with
"You no longer have permission to make this change." and changes, emits and invalidates nothing. A committed change
drops its tenant's cached reads with `revalidateTag(collectionTag(scope.tenantId, name), { expire: 0 })`.
`assistantTools(collections, writer, guard)` and `respond({ ..., guard })` take that guard.

```ts
const scope = await resolveAccess().catch((e: unknown) => { if (e instanceof Unauthenticated) return null; throw e; });
if (!scope) return new Response(null, { status: 401 });
const readable = (await Promise.all(collections.map(async (c) => ((await can(scope, c.name, 'read')) ? collectionFor(scope, c.name) : null)))).filter((c) => c !== null);
const guard = {
  authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => {
    const now = await resolveAccess().catch(() => null);
    return now !== null && now.tenantId === scope.tenantId && now.subjectId === scope.subjectId && can(now, name, op, ids);
  },
  invalidate: (name: string) => revalidateTag(collectionTag(scope.tenantId, name), { expire: 0 }),
};
```

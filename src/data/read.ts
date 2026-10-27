/**
 * The pages' read: authorized, scoped and cached. A page calls `read()`, or `aggregate()` for a figure over every row;
 * it cannot choose a tenant, and the cached helpers below see only the whole scope, the collection's name and the
 * normalized query. A write calls `updateTag(collectionTag(tenantId, name))` after it commits, which drops every user's
 * cached variants of that collection, rows and aggregates alike, and nobody else's.
 *
 * Each read has two forms. `read`, `readAll` and `aggregate` resolve the request's own scope; `readInScope`,
 * `readAllInScope` and `aggregateInScope` take a scope a module already holds. The resolving form delegates, so there is
 * one implementation and one cache: a call through either form shares the entry the other reads.
 */
import { createHash } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { normalizeAggregate, normalizeQuery, type AggregateQuery, type AggregateResult, type Query } from '@/lib/collection';
import { AccessDenied, collectionFor, can, resolveAccess, type AccessScope } from '@/data/access';
import { clock } from '@/data/collections';

/** `collection:` and the SHA-256 of the tenant and the name: bounded, deterministic and free of any raw identifier. */
export const collectionTag = (tenantId: string, name: string): string =>
  `collection:${createHash('sha256').update(JSON.stringify([tenantId, name])).digest('hex')}`;

async function cachedRead(scope: AccessScope, name: string, query: Query) {
  'use cache';
  cacheTag(collectionTag(scope.tenantId, name));
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const collection = collectionFor(scope, name);
  // The stamp is taken before the query: a write in between makes the stamp older than the rows, never newer.
  const revision = collection.revision?.();
  const { rows, total } = await collection.query(query);
  return { rows, total, revision, observedAt: clock().toISOString() };
}

/**
 * The rows of a collection the scope may read, with the time the read actually ran. It asks the grant the resolving
 * `read` asks, the same way and with the same message, and throws before any cached code runs when the scope may not.
 */
export async function readInScope(scope: AccessScope, name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; total: number; revision?: string; observedAt: string }> {
  if (!(await can(scope, name, 'read'))) throw new AccessDenied();
  return cachedRead(scope, name, normalizeQuery(collectionFor(scope, name), q));
}

/** The rows of a collection the caller may read, with the time the read actually ran. Throws before any cached code runs when it may not. */
export async function read(name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; total: number; revision?: string; observedAt: string }> {
  return readInScope(await resolveAccess(), name, q);
}

async function cachedAggregate(scope: AccessScope, name: string, query: AggregateQuery) {
  'use cache';
  cacheTag(collectionTag(scope.tenantId, name));
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const collection = collectionFor(scope, name);
  const revision = collection.revision?.();
  const result = await collection.aggregate(query);
  return { ...result, revision, observedAt: clock().toISOString() };
}

/**
 * An aggregate query over every row of a collection the scope may read, answered by the collection itself, with the time
 * it actually ran. It asks the grant the resolving `aggregate` asks and throws before any cached code runs when it may not.
 */
export async function aggregateInScope(scope: AccessScope, name: string, q: AggregateQuery): Promise<AggregateResult & { revision?: string; observedAt: string }> {
  if (!(await can(scope, name, 'read'))) throw new AccessDenied();
  return cachedAggregate(scope, name, normalizeAggregate(collectionFor(scope, name), q));
}

/**
 * An aggregate query over every row of a collection the caller may read, answered by the collection itself, with the
 * time it actually ran. It asks the grant `read()` asks and throws before any cached code runs when it may not.
 */
export async function aggregate(name: string, q: AggregateQuery): Promise<AggregateResult & { revision?: string; observedAt: string }> {
  return aggregateInScope(await resolveAccess(), name, q);
}

/** The most rows one read returns (`normalizeQuery`'s own ceiling). */
const PAGE = 500;

/**
 * Every row a question keeps, of a collection the scope may read. A read returns a page, so this keeps asking the *same*
 * question until the total is in hand: a count, a join or a summary over a collection starts here, never from a first
 * page. The order and the conditions are re-asked of every page, so a table claiming "each" is not the first page of
 * something else. Any `limit` the caller passes is ignored: asking here means every row.
 */
export async function readAllInScope(scope: AccessScope, name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; revision?: string; observedAt: string }> {
  const first = await readInScope(scope, name, { ...q, limit: PAGE });
  // The first page says how many there are, so the rest are asked together: one after another, a read of N pages waited
  // N round trips (a year of usage for twenty models is fifteen).
  const offsets = Array.from({ length: Math.max(0, Math.ceil(first.total / PAGE) - 1) }, (_, i) => (i + 1) * PAGE);
  const rest = await Promise.all(offsets.map((offset) => readInScope(scope, name, { ...q, limit: PAGE, offset })));
  const rows = [...first.rows, ...rest.flatMap((page) => page.rows)];
  if (rows.length < first.total) throw new Error(`${name} could not be read in full.`);
  return { rows, revision: first.revision, observedAt: first.observedAt };
}

/** Every row a question keeps, of a collection the caller may read. It resolves the request's own scope and reads it exactly as `readAllInScope` does. */
export async function readAll(name: string, q: Query = {}): Promise<{ rows: Record<string, unknown>[]; revision?: string; observedAt: string }> {
  return readAllInScope(await resolveAccess(), name, q);
}

/**
 * The names of the members these ids name, and nothing else: a join, not a read. A module that has already authorized
 * its own records (tickets, say) asks here for the names they point at, so names only leave this file and no
 * `members:read` is asked of a caller who holds only the grant their own read needed — a Viewer still sees an assignee.
 */
export async function memberNamesFor(scope: AccessScope, ids: readonly string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const roster = collectionFor(scope, 'members');
  const chunks = Array.from({ length: Math.ceil(ids.length / PAGE) }, (_, i) => ids.slice(i * PAGE, (i + 1) * PAGE));
  const found = await Promise.all(chunks.map((chunk) => roster.query({ where: [{ field: 'id', op: 'in', value: chunk }], limit: PAGE })));
  for (const row of found.flatMap((f) => f.rows)) names.set(row.id as string, row.name as string);
  return names;
}

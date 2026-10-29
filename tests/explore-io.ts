// A helper of the explore-* tests, not a test: vitest collects only *.test.* files, so it is never run on its own.
import { aggregateRows, queryRows } from '@/lib/collection';
import type { ExploreIO, ExploreRights } from '@/lib/explore';

/** The day the tests' rows are dated against, fixed so that no answer moves with the clock. */
export const TODAY = '2026-10-13';
/** The date `n` days before TODAY. */
export const back = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
/** Someone who may read each collection named, every field of it. */
export const reader = (...names: string[]): ExploreRights => ({ readable: new Set(names), hidden: () => [] });
/** A prepared query's reads, answered from rows held in memory and keyed by `key`, whatever collection is named. */
export const memoryIO = (rows: Record<string, unknown>[], key = 'id'): ExploreIO => ({
  aggregate: async (_, q) => aggregateRows(rows, q),
  read: async (_, q) => queryRows(rows, key, q),
  today: TODAY,
});

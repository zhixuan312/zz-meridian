/**
 * What every write boundary shares (`member-mutations.ts`, `ticket-mutations.ts`): its writes run one at a time for a
 * workspace, and a write that commits drops the cached reads from wherever it came. A product replaces the queue with a
 * database transaction; the adopter guide says so.
 */
import { revalidateTag, updateTag } from 'next/cache';

/**
 * Invalidate a tag after a write, from wherever the write came. `updateTag` is the right call from a Server Action —
 * it gives the person their own change on the next read — but Next allows it only there, and it throws everywhere
 * else, which is exactly where a boundary's other callers live: the assistant's route handler and an adopter's
 * MCP server. `revalidateTag` is the call that works in both, so a write from an agent invalidates the same tag
 * instead of failing the change. Found by the assistant walk-through in a built app: suspending a member through an
 * approved Proposal answered "updateTag can only be called from within a Server Action" and the rows never moved.
 */
export function invalidate(t: string) {
  try {
    updateTag(t);
  } catch {
    revalidateTag(t, { expire: 0 });
  }
}

/**
 * One promise queue per workspace for one kind of write, on globalThis so a route handler, a server action and a page
 * share it. `name` keeps each boundary's writes in a queue of their own.
 */
export function writeQueue(name: string) {
  const QUEUES = Symbol.for(`zz-meridian.${name}`);
  const queues = () => ((globalThis as Record<symbol, unknown>)[QUEUES] ??= new Map<string, Promise<unknown>>()) as Map<string, Promise<unknown>>;
  return function enqueue<T>(tenantId: string, step: () => Promise<T>): Promise<T> {
    const tail = queues().get(tenantId) ?? Promise.resolve();
    const run = tail.then(step, step);
    // The queue holds a settled copy, so a refused step never leaves an unhandled rejection behind it.
    queues().set(tenantId, run.then(() => undefined, () => undefined));
    return run;
  };
}

/**
 * An answer built from records rather than stored beside them, and the two facts that make it one answer: the moment
 * it was built and the state of its source it was built from. A read is served the answer it already has, with its own
 * moment, until the source's revision moves — a read never re-stamps an older answer as fresh.
 *
 * The cache is in-process like the collection store (`@/lib/collection`): a page, a route handler and the assistant
 * share one answer per name and full access scope: tenant, subject and authorization identity. `source` is asked on
 * every read, before it can join a build, because only it can authorize the read and say whether the records moved;
 * `build` runs only when the revision it answers differs from the one the answer was built from.
 */
import { clock } from '@/data/collections';
import type { AccessScope } from '@/data/access';

export type DerivedAnswer<T> = {
  /** The answer, or null when its first build threw: nothing was built, and a later read tries again. */
  data: T | null;
  /** When `build` last ran, never when a read was served: an unchanged read keeps the answer's own moment. Empty when no build has succeeded. */
  builtAt: string;
  /** The revision `source` answered when the answer was built, or when its first build was tried. */
  sourceRevision: string;
};

type DerivedOptions<T> = {
  /** The answer's identity within one full access scope in this process. */
  name: string;
  /** The tenant, subject and authorization identity whose records the answer may only ever hold. */
  scope: AccessScope;
  /**
   * The authorized state the answer would be built from, called on every read, even while a build is running: at least
   * its revision, which says whether to build. A failure here is a failed read, not a failed build, and is thrown.
   */
  source: () => Promise<{ revision: string }>;
  /** Builds the answer from that state. Run only when the revision moved; a throw leaves the previous answer standing. */
  build: () => Promise<T>;
};

/** What the process keeps per name and full access scope: the last answer and any build in progress. */
type Held = DerivedAnswer<unknown>;
type Slot = { held?: Held; pending?: Promise<Held> };

const SLOTS = Symbol.for('zz-meridian.derived');
const slots = () => ((globalThis as Record<symbol, unknown>)[SLOTS] ??= new Map<string, Slot>()) as Map<string, Slot>;

/**
 * The answer `name` stands for, built from `source` when its revision moved: `{ data, builtAt, sourceRevision }`. A
 * rebuild that throws leaves the previous answer standing with its own moment; a first build that throws answers with
 * null data and no moment, and a later read tries again. After its own source check, a read joins any build in progress,
 * even if it observed a different revision; a later read can rebuild for that revision.
 */
export async function derivedAnswer<T>({ name, scope, source, build }: DerivedOptions<T>): Promise<DerivedAnswer<T>> {
  const all = slots();
  const key = JSON.stringify([scope.tenantId, scope.subjectId, scope.authorizationKey, name]);
  const slot = (all.get(key) ?? {}) as Slot;
  all.set(key, slot);
  const heldBeforeSource = slot.held;
  const { revision } = await source();
  const run = slot.pending ?? (slot.pending = (async (): Promise<Held> => {
    // A build that finished during this source check stands; this overlapping read must not replace it.
    if (slot.held && (slot.held !== heldBeforeSource || slot.held.sourceRevision === revision)) return slot.held;
    try {
      slot.held = { data: await build(), builtAt: clock().toISOString(), sourceRevision: revision };
      return slot.held;
    } catch {
      // The records moved but the new answer could not be built: the one standing is still the answer, with its moment.
      return slot.held ?? { data: null, builtAt: '', sourceRevision: revision };
    }
  })());
  try {
    return (await run) as DerivedAnswer<T>;
  } finally {
    if (slot.pending === run) slot.pending = undefined;
  }
}

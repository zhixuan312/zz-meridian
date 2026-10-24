/**
 * An answer built from records rather than stored beside them, and the two facts that make it one answer: the moment
 * it was built and the state of its source it was built from. A read is served the answer it already has, with its own
 * moment, until the source's revision moves — a read never re-stamps an older answer as fresh.
 *
 * The cache is in-process like the collection store (`@/lib/collection`): a page, a route handler and the assistant
 * share one answer per name. `source` is asked on every read, because only it can say whether the records moved;
 * `build` runs only when the revision it answers differs from the one the answer was built from.
 */
import { clock } from '@/data/collections';

export type DerivedAnswer<T> = {
  /** The answer, or null when its first build threw: nothing was built, and a later read tries again. */
  data: T | null;
  /** When `build` last ran, never when a read was served: an unchanged read keeps the answer's own moment. Empty when no build has succeeded. */
  builtAt: string;
  /** The revision `source` answered when the answer was built, or when its first build was tried. */
  sourceRevision: string;
};

type DerivedOptions<T> = {
  /** The answer's identity in this process: two answers under one name are the same answer. */
  name: string;
  /**
   * The state the answer would be built from, called on every read: at least its revision, which is all a read needs
   * to know whether to build. A failure here is a failed read, not a failed build, and is thrown.
   */
  source: () => Promise<{ revision: string }>;
  /** Builds the answer from that state. Run only when the revision moved; a throw leaves the previous answer standing. */
  build: () => Promise<T>;
};

/** What the process keeps per name: the last answer and, while one is running, the read that is building it. */
type Held = DerivedAnswer<unknown>;
type Slot = { held?: Held; pending?: Promise<Held> };

const SLOTS = Symbol.for('zz-meridian.derived');
const slots = () => ((globalThis as Record<symbol, unknown>)[SLOTS] ??= new Map<string, Slot>()) as Map<string, Slot>;

/**
 * The answer `name` stands for, built from `source` when its revision moved: `{ data, builtAt, sourceRevision }`. A
 * rebuild that throws leaves the previous answer standing with its own moment; a first build that throws answers with
 * null data and no moment, and a later read tries again. A read that arrives while a build is running waits for it.
 */
export async function derivedAnswer<T>({ name, source, build }: DerivedOptions<T>): Promise<DerivedAnswer<T>> {
  const all = slots();
  const slot = (all.get(name) ?? {}) as Slot;
  all.set(name, slot);
  const run = slot.pending ?? (slot.pending = (async (): Promise<Held> => {
    const { revision } = await source();
    if (slot.held && slot.held.sourceRevision === revision) return slot.held;
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

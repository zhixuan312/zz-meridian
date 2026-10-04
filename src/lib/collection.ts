import { z } from 'zod';

/** A named set of records the pages and the assistant read and change through one interface. */
type Op = 'create' | 'update' | 'remove';
type Scalar = string | number | boolean | null;
type Value = Scalar | Scalar[];
type Condition = { field: string; op: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in'; value: Value };
type Query = { where?: Condition[]; sort?: { field: string; dir: 'asc' | 'desc' }; limit?: number };

export type Collection<T extends Record<string, unknown>, K extends keyof T & string> = {
  name: string;
  label: string;
  description: string;
  /** The record without its key, as a write takes it. */
  fields: z.ZodObject;
  /**
   * Fields the data layer works out and no write ever takes: a score, a band, a stage, a value joined in from another
   * table. They live on the record, so a page reads them and the assistant may filter on them, and they are never in
   * `fields` — a change cannot set one, because `patchOf` builds its shape from `fields` alone.
   */
  derived?: (keyof T & string)[];
  key: K;
  title: (row: T) => string;
  query: (q: Query) => Promise<{ rows: T[]; total: number }>;
  /**
   * A plain record, validated by `fields`, and never `Omit<T, K>`.
   *
   * A record type carries fields a write does not take — the worked-out ones above, and data joined in from elsewhere —
   * and a form hands over strings, so `Omit<T, K>` demands things the caller cannot supply and every real data layer
   * ends up casting around it. The write shape is `fields`; this says so, and `fields.parse` is what holds it.
   */
  create?: (input: Record<string, unknown>) => Promise<T>;
  update?: (ids: string[], patch: Record<string, unknown>) => Promise<T[]>;
  remove?: (ids: string[]) => Promise<number>;
  /** Operations only a page may perform; the assistant and an MCP server never get them. */
  pageOnly?: Op[];
  /** Fields only a page may see: left out of every assistant tool's input and result. */
  hidden?: (keyof T)[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCollection = Collection<any, any>;

/**
 * One store per name per process, on globalThis, so a route handler, a server action and a page share it. `next` is the
 * next id's number: it only grows, so a removed record's id is never given to a new one.
 */
type Store = { rows: Record<string, unknown>[]; next: number };
const STORES = Symbol.for('zz-meridian.collections');
const stores = () => ((globalThis as Record<symbol, unknown>)[STORES] ??= new Map<string, Store>()) as Map<string, Store>;

/** Code-point order for strings, numeric order for numbers. */
function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const x = Array.from(String(a), (c) => c.codePointAt(0)!), y = Array.from(String(b), (c) => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** A null field matches only `ne`; `gt`/`lt` need the field and the value to be the same kind. */
function matches(row: Record<string, unknown>, { field, op, value }: Condition): boolean {
  const v = row[field];
  if (v === null || v === undefined) return op === 'ne';
  switch (op) {
    case 'eq': return v === value;
    case 'ne': return v !== value;
    case 'gt': return typeof v === typeof value && compare(v, value) > 0;
    case 'lt': return typeof v === typeof value && compare(v, value) < 0;
    case 'contains': return String(v).toLowerCase().includes(String(value).toLowerCase());
    case 'in': return Array.isArray(value) && value.includes(v as Scalar);
  }
}

export function arrayCollection<T extends Record<string, unknown>, K extends keyof T & string>(def: {
  name: string;
  label: string;
  description: string;
  fields: z.ZodObject;
  derived?: (keyof T & string)[];
  key: K;
  title: (row: T) => string;
  rows: T[];
  allow: readonly Op[];
  pageOnly?: Op[];
  hidden?: (keyof T)[];
}): Collection<T, K> {
  const { name, key, allow } = def;
  if (key in def.fields.shape) throw new Error(`${name}: fields describe the record without its key, so they cannot name ${key}`);
  if (!stores().has(name)) {
    const top = def.rows.reduce((m, r) => Math.max(m, Number(/_(\d+)$/.exec(String(r[key]))?.[1] ?? 0)), 0);
    stores().set(name, { rows: structuredClone(def.rows), next: top + 1 });
  }
  const store = () => stores().get(name)!;
  const rows = () => store().rows as T[];
  const copy = <R,>(r: R): R => structuredClone(r);
  const missing = (ids: string[]) => ids.filter((id) => !rows().some((r) => r[key] === id));
  const pick = (ids: string[]) => {
    const gone = missing(ids);
    // The sentence is the whole diagnosis, and the same one reaches the form's banner, the assistant's tool result and
    // a REST route of your own: `src/lib/assistant/tools.ts` wraps a thrown message, and the sample's server actions
    // return it, so nothing has to be translated between them. A REST surface maps it to a status where it lives.
    if (gone.length) throw new Error(`No ${name} with id ${gone.join(', ')}`);
    return rows().filter((r) => ids.includes(r[key] as string));
  };

  const c: Collection<T, K> = {
    name,
    label: def.label,
    description: def.description,
    fields: def.fields,
    derived: def.derived,
    key,
    title: def.title,
    pageOnly: def.pageOnly,
    hidden: def.hidden,
    async query({ where = [], sort, limit }) {
      const hits = rows().filter((r) => where.every((w) => matches(r, w)));
      if (sort) {
        const s = sort.dir === 'desc' ? -1 : 1;
        hits.sort((a, b) => {
          const x = a[sort.field], y = b[sort.field];
          if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
          return s * compare(x, y);
        });
      }
      return { rows: copy(limit === undefined ? hits : hits.slice(0, limit)), total: hits.length };
    },
  };
  if (allow.includes('create')) {
    c.create = async (input) => {
      const row = { ...def.fields.parse(input), [key]: `${name}_${store().next++}` } as unknown as T;
      rows().push(row);
      return copy(row);
    };
  }
  if (allow.includes('update')) {
    c.update = async (ids, patch) => {
      const set = patchOf(def.fields).parse(patch);
      const hit = pick(ids);
      for (const r of hit) Object.assign(r, set);
      return copy(hit);
    };
  }
  if (allow.includes('remove')) {
    c.remove = async (ids) => {
      const hit = new Set(pick(ids));
      store().rows = rows().filter((r) => !hit.has(r));
      return hit.size;
    };
  }
  return c;
}

/**
 * What a change may set: any of `fields`, none required, nothing else. A field's default is dropped, so a change that
 * does not name a field never resets it.
 */
export function patchOf(fields: z.ZodObject): z.ZodObject {
  const optional = (f: z.ZodType) => {
    const g = withoutDefault(f).optional();
    return f.description ? g.describe(f.description) : g;
  };
  return z.object(Object.fromEntries(Object.entries(fields.shape).map(([k, f]) => [k, optional(f)]))).strict();
}

/** `field` with every default, prefault and catch removed, however deep in optional, nullable or readonly. */
function withoutDefault(field: z.ZodType): z.ZodType {
  const inner = () => withoutDefault((field.def as unknown as { innerType: z.ZodType }).innerType);
  return field instanceof z.ZodDefault || field instanceof z.ZodPrefault || field instanceof z.ZodCatch ? inner()
    : field instanceof z.ZodOptional ? inner().optional()
    : field instanceof z.ZodNullable ? inner().nullable()
    : field instanceof z.ZodReadonly ? inner().readonly()
    : field;
}

/** The collection's fields without its hidden ones. */
export function visibleFields(c: AnyCollection): z.ZodObject {
  return c.fields.omit(Object.fromEntries(((c.hidden ?? []) as string[]).map((f) => [f, true])) as Record<string, true>).strict();
}

/** The input schema of the query tool: field names come from the collection, so an unknown or hidden field is rejected.
 *
 * `derived` fields are named here and nowhere else: they are readable and queryable, and no write can set one, because
 * `fields` is what a write takes. `visibleFields` has already dropped the hidden ones from `fields`, so only a hidden
 * derived field needs dropping here. */
export function queryInput(c: AnyCollection) {
  const hidden = new Set((c.hidden ?? []) as string[]);
  const derived = ((c.derived ?? []) as string[]).filter((f) => !hidden.has(f));
  const field = z.enum([c.key, ...Object.keys(visibleFields(c).shape), ...derived] as [string, ...string[]]);
  const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  return z.object({
    where: z.array(z.object({ field, op: z.enum(['eq', 'ne', 'gt', 'lt', 'contains', 'in']), value: z.union([scalar, z.array(scalar)]) })).optional(),
    sort: z.object({ field, dir: z.enum(['asc', 'desc']) }).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  });
}

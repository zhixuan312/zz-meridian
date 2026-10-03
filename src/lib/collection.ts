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
  /** The record without its key. */
  fields: z.ZodObject;
  key: K;
  title: (row: T) => string;
  query: (q: Query) => Promise<{ rows: T[]; total: number }>;
  create?: (input: Omit<T, K>) => Promise<T>;
  update?: (ids: string[], patch: Partial<Omit<T, K>>) => Promise<T[]>;
  remove?: (ids: string[]) => Promise<number>;
  /** Operations only a page may perform; the assistant and an MCP server never get them. */
  pageOnly?: Op[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCollection = Collection<any, any>;

/** One store per name per process, on globalThis, so a route handler, a server action and a page share it. */
const STORES = Symbol.for('zz-meridian.collections');
const stores = () => ((globalThis as Record<symbol, unknown>)[STORES] ??= new Map<string, Record<string, unknown>[]>()) as Map<string, Record<string, unknown>[]>;

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
  key: K;
  title: (row: T) => string;
  rows: T[];
  allow: readonly Op[];
  pageOnly?: Op[];
}): Collection<T, K> {
  const { name, key, allow } = def;
  if (!stores().has(name)) stores().set(name, structuredClone(def.rows));
  const rows = () => stores().get(name) as T[];
  const copy = <R,>(r: R): R => structuredClone(r);
  const missing = (ids: string[]) => ids.filter((id) => !rows().some((r) => r[key] === id));
  const pick = (ids: string[]) => {
    const gone = missing(ids);
    if (gone.length) throw new Error(`No ${name} with id ${gone.join(', ')}`);
    return rows().filter((r) => ids.includes(r[key] as string));
  };

  const c: Collection<T, K> = {
    name,
    label: def.label,
    description: def.description,
    fields: def.fields,
    key,
    title: def.title,
    pageOnly: def.pageOnly,
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
      const top = rows().reduce((m, r) => Math.max(m, Number(/_(\d+)$/.exec(String(r[key]))?.[1] ?? 0)), 0);
      const row = { ...input, [key]: `${name}_${top + 1}` } as unknown as T;
      rows().push(row);
      return copy(row);
    };
  }
  if (allow.includes('update')) {
    c.update = async (ids, patch) => {
      const hit = pick(ids);
      for (const r of hit) Object.assign(r, patch);
      return copy(hit);
    };
  }
  if (allow.includes('remove')) {
    c.remove = async (ids) => {
      const hit = new Set(pick(ids));
      stores().set(name, rows().filter((r) => !hit.has(r)));
      return hit.size;
    };
  }
  return c;
}

/** The input schema of the query tool: field names come from the collection, so an unknown field is rejected. */
export function queryInput(c: AnyCollection) {
  const field = z.enum([c.key, ...Object.keys(c.fields.shape)] as [string, ...string[]]);
  const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  return z.object({
    where: z.array(z.object({ field, op: z.enum(['eq', 'ne', 'gt', 'lt', 'contains', 'in']), value: z.union([scalar, z.array(scalar)]) })).optional(),
    sort: z.object({ field, dir: z.enum(['asc', 'desc']) }).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  });
}

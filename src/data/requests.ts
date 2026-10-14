/**
 * The request log's reads: the address becomes one validated query, and a page, the embed and the CSV export all ask
 * the collection the same question. A page reads through `read()`; the export, which must not be cached and may be
 * larger than a page, queries its authorized collection itself.
 */
import type { Query } from '@/lib/collection';
import { attempt } from '@/data/main';
import { read, readAll } from '@/data/read';
import { REQUEST_METHODS } from '@/data/request-methods';
import { REGION_NAMES, type CustomerRecord, type RequestRow } from '@/data/sample';

/** Rows a page sends, and the size the table pages by. */
export const REQUEST_PAGE = 20;
/** The most rows a summary reads. A set larger than this is summarized from its first 500 in the table's order. */
const SUMMARY_ROWS = 500;
const MAX_PAGE = 5000;
const MAX_Q = 100;

const STATUSES = ['2xx', '3xx', '4xx', '5xx'];
/** The table's sortable columns, and the field each one orders by. */
const SORT_FIELD: Record<string, string> = { request: 'route', status: 'status', latency: 'latency', customer: 'customer', size: 'bytes', at: 'at' };

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const oneOf = (v: string | string[] | undefined, allowed: string[]) => (allowed.includes(one(v)) ? one(v) : 'all');

/**
 * The address as the query it asks: filters as conditions, the page as an offset, the newest first by default. A value
 * the table does not offer falls back to its default and never reaches the query. `state` is the validated address,
 * for the view.
 */
export function requestsQuery(params: Params) {
  const q = one(params.q).trim().slice(0, MAX_Q);
  const status = oneOf(params.status, STATUSES);
  const method = oneOf(params.method, REQUEST_METHODS);
  const region = oneOf(params.region, REGION_NAMES);
  const sort = one(params.sort) in SORT_FIELD ? one(params.sort) : 'at';
  const dir = one(params.dir) === 'asc' ? 'asc' : 'desc';
  const n = Number(one(params.page));
  const page = Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_PAGE) : 1;

  const where: NonNullable<Query['where']> = [];
  if (q) where.push({ field: 'search', op: 'contains', value: q.toLowerCase() });
  if (status !== 'all') where.push({ field: 'statusClass', op: 'eq', value: status });
  if (method !== 'all') where.push({ field: 'method', op: 'eq', value: method });
  if (region !== 'all') where.push({ field: 'region', op: 'eq', value: region });
  const query: Query = { where, sort: { field: SORT_FIELD[sort], dir }, limit: REQUEST_PAGE, offset: (page - 1) * REQUEST_PAGE };
  return { state: { q, status, method, region, sort, dir, page }, query };
}

/**
 * A request as the log carries it: the record without the time to its first token, which the list does not draw and a
 * page of twenty rows does not send. A request's own page reads the record whole. `customerId` is the id of the customer
 * it names, which opens that customer's page; a row has none when the customers hold no customer of that name, or
 * could not be read, and its name is then text.
 */
export type LoggedRequest = Omit<RequestRow, 'ttft'> & { customerId?: string };

/** A collection row as a page may carry it: the logged request, without the values the data layer worked out. */
const publicRows = (rows: Record<string, unknown>[]): LoggedRequest[] =>
  rows.map(({ id, at, method, route, status, latency, customer, region, bytes, model }) => ({ id, at, method, route, status, latency, customer, region, bytes, model }) as LoggedRequest);

/**
 * Each customer's id by its name, worked out on the server from the customers collection: the log names a customer by
 * name, and a page links the name to the customer's own. Empty when the customers cannot be read.
 */
async function customerIds(): Promise<Map<string, string>> {
  const all = await attempt(async () => (await readAll('customers')).rows as CustomerRecord[]);
  return new Map((all ?? []).map((c) => [c.name, c.id]));
}

/** The newest requests of the log from one customer, by its name, newest first. */
export async function readLatestFrom(customer: string, limit: number): Promise<LoggedRequest[]> {
  const { rows } = await read('requests', { where: [{ field: 'customer', op: 'eq', value: customer }], sort: { field: 'at', dir: 'desc' }, limit });
  return publicRows(rows);
}

const isError = (r: LoggedRequest) => r.status >= 500 || r.status === 429;
const p95Of = (rs: LoggedRequest[]) => {
  const l = rs.map((r) => r.latency).sort((a, b) => a - b);
  return l.length ? l[Math.floor((l.length - 1) * 0.95)] : 0;
};
const errorShare = (rs: LoggedRequest[]) => (rs.length ? rs.filter(isError).length / rs.length : 0);
const change = (now: number, before: number) => (before ? now / before - 1 : null);

/** The commonest route, customer and region in `rows`, each with its share of them. */
function commonest(rows: LoggedRequest[]) {
  const top = (key: (r: LoggedRequest) => string) => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
    const [value, n] = [...counts].reduce((m, e) => (e[1] > m[1] ? e : m), ['', 0]);
    return rows.length ? { value, share: n / rows.length } : null;
  };
  return { count: rows.length, route: top((r) => `${r.method} ${r.route}`), customer: top((r) => r.customer), region: top((r) => r.region) };
}

/** What the tiles draw, worked out on the server: twelve 5-minute buckets, oldest first, and the last half hour against the one before. */
function summarize(rows: LoggedRequest[], total: number, observedAt: string) {
  const B = 12, W = 5 * 60_000, end = new Date(observedAt).getTime();
  const out = Array.from({ length: B }, () => [] as LoggedRequest[]);
  for (const r of rows) {
    const i = B - 1 - Math.floor((end - new Date(r.at).getTime()) / W);
    if (i >= 0 && i < B) out[i].push(r);
  }
  const half = (f: (rs: LoggedRequest[]) => number, a: number, b: number) => f(out.slice(a, b).flat());
  const delta = (f: (rs: LoggedRequest[]) => number) => change(half(f, 6, 12), half(f, 0, 6));
  return {
    count: total,
    errorShare: errorShare(rows),
    p95: p95Of(rows),
    buckets: { count: out.map((b) => b.length), errors: out.map(errorShare), p95: out.map(p95Of) },
    deltas: { count: delta((rs) => rs.length), errors: delta(errorShare), p95: delta(p95Of) },
    /** How many requests each half hour holds: a change between two handfuls is not a trend. */
    halves: { before: half((rs) => rs.length, 0, 6), after: half((rs) => rs.length, 6, 12) },
    /** The oldest and newest request summarized. */
    span: rows.length ? { from: rows.reduce((m, r) => (r.at < m ? r.at : m), rows[0].at), to: rows.reduce((m, r) => (r.at > m ? r.at : m), rows[0].at) } : null,
    /** What the summarized requests, and their errors, most have in common: the commonest value of each field and its share. */
    common: { all: commonest(rows), errors: commonest(rows.filter(isError)) },
    rows: rows.length,
    partial: total > SUMMARY_ROWS,
  };
}

/**
 * One page of the filtered, sorted log, its total, and the summary of the whole filtered set. With `customers`, each
 * row of the page carries the id of the customer it names, so the console's log opens the customer's page from its
 * name. The embed asks without it: its rows open through the host, and a link inside a cell would navigate its frame.
 */
export async function readRequests(params: Params, { customers = false }: { customers?: boolean } = {}) {
  const { state, query } = requestsQuery(params);
  let page = await read('requests', query);
  let at = state.page;
  if (!page.rows.length && page.total > 0) {
    // A page past the end: show the last one rather than nothing.
    at = Math.ceil(page.total / REQUEST_PAGE);
    page = await read('requests', { ...query, offset: (at - 1) * REQUEST_PAGE });
  }
  const [whole, ids] = await Promise.all([read('requests', { where: query.where, sort: { field: 'at', dir: 'desc' }, limit: SUMMARY_ROWS, offset: 0 }), customers ? customerIds() : null]);
  const rows = publicRows(page.rows);
  return {
    rows: ids ? rows.map((r) => (ids.has(r.customer) ? { ...r, customerId: ids.get(r.customer) } : r)) : rows,
    total: page.total,
    summary: summarize(publicRows(whole.rows), page.total, page.observedAt),
    state: { ...state, page: at },
    observedAt: page.observedAt,
  };
}

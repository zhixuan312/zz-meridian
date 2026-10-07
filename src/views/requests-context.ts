/**
 * The request log's shared context (decision 0011): the console page, the MCP view and the console's assistant read the
 * same account of the matching requests, and of what they have in common. The tiles' definitions live here too.
 */
import type { readRequests } from '@/data/requests';
import type { RequestRow } from '@/data/sample';
import { formatDuration, formatPercent } from '@/lib/format';
import { formatDateTime } from '@/lib/format-date';
import { SMALL_SAMPLE } from '@/lib/insight';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

type Read = Awaited<ReturnType<typeof readRequests>>;
/** One page of the log as a view holds it; `pageSize` is how many rows the server pages by. */
export type RequestsData = Pick<Read, 'total' | 'summary' | 'state'> & { rows: RequestRow[]; pageSize: number; updatedAt: string; now: string };

/** The tiles' definitions: the info buttons show them and the agents read them. */
export const REQUEST_METRICS = {
  count: { label: 'Requests', filtered: 'Matching requests', hint: 'Requests that match the filters. The line shows them in 5-minute steps; the change compares the last half hour with the one before.' },
  errors: { label: 'Errors and limits', hint: 'Share answered with a 5xx or a 429.' },
  p95: { label: 'Latency p95', hint: '95 of every 100 matching requests finished faster than this.' },
} as const;

/** The filters that are set, in words: "status 5xx, POST, in eu-west-1, matching "orbit"". */
export function describeFilters(s: Pick<Read['state'], 'q' | 'status' | 'method' | 'region'>): string {
  return [s.status !== 'all' && `status ${s.status}`, s.method !== 'all' && s.method, s.region !== 'all' && `in ${s.region}`, s.q && `matching "${s.q}"`].filter(Boolean).join(', ');
}

/** The console address of this exact view: its filters, then its sort and page when they are not the defaults. */
export function requestsAddress(s: Read['state']): string {
  const p = new URLSearchParams();
  for (const k of ['q', 'status', 'method', 'region'] as const) if (s[k] && s[k] !== 'all') p.set(k, s[k]);
  if (s.sort !== 'at' || s.dir !== 'desc') { p.set('sort', s.sort); p.set('dir', s.dir); }
  if (s.page > 1) p.set('page', String(s.page));
  const q = p.toString();
  return `/requests${q ? `?${q}` : ''}`;
}

const changeOf = (r: number | null) => (r === null ? 'no half hour before to compare' : `${Math.abs(r) < 0.0005 ? 'unchanged' : `${r > 0 ? 'up' : 'down'} ${formatPercent(Math.abs(r), 1)}`} vs the half hour before`);

/** The request log's context for `data`; `shown` is how many of the page's rows the view draws (five inline in an embed). */
export function requestsContext(data: RequestsData, shown = data.rows.length): SharedContext {
  const { summary: s, state, total } = data;
  const filters = describeFilters(state);
  const address = requestsAddress(state);
  const M = REQUEST_METRICS;
  const span = s.span ? `received ${formatDateTime(s.span.from)} to ${formatDateTime(s.span.to)} UTC` : 'none received';
  const scope = `${filters ? `requests with ${filters}` : 'every request'}, ${span}`;
  const thin = s.halves.before < SMALL_SAMPLE || s.halves.after < SMALL_SAMPLE;
  const facts: Fact[] = [
    { label: filters ? M.count.filtered : M.count.label, value: total.toLocaleString('en-US'), change: changeOf(s.deltas.count), definition: M.count.hint },
    { label: M.errors.label, value: formatPercent(s.errorShare, 1), change: changeOf(s.deltas.errors), definition: M.errors.hint },
    { label: M.p95.label, value: formatDuration(s.p95), change: changeOf(s.deltas.p95), definition: M.p95.hint },
  ];

  const insights: Insight[] = [];
  const unknowns: string[] = [];
  if (thin && s.rows) unknowns.push(`The changes compare ${s.halves.after} requests in the last half hour with ${s.halves.before} in the one before: too few to read as a trend.`);
  if (s.partial) unknowns.push(`The figures are worked out from the newest 500 of the ${total.toLocaleString('en-US')} matching requests.`);
  // What the matching requests, and their errors, have in common: a concentration a table of rows does not show.
  const say = (who: 'errors' | 'all') => {
    const c = s.common[who];
    if (c.count < 5) return;
    const noun = who === 'errors' ? 'of the errors and limits' : 'of the matching requests';
    const parts = (['route', 'customer', 'region'] as const)
      .map((k) => c[k] && c[k]!.share >= 0.5 && { k, ...c[k]! })
      .filter((x): x is { k: 'route' | 'customer' | 'region'; value: string; share: number } => !!x);
    if (!parts.length) return;
    const first = parts[0];
    insights.push({
      text: `${parts.map((p) => `${Math.round(p.share * c.count)} of the ${c.count} ${noun.replace(/^of the /, '')} ${p.k === 'route' ? `are ${p.value}` : p.k === 'customer' ? `come from ${p.value}` : `are in ${p.value}`} (${formatPercent(p.share, 0)})`).join('; ')}.`,
      evidence: requestsAddress({ ...state, page: 1, sort: 'at', dir: 'desc', ...(first.k === 'region' ? { region: first.value } : { q: first.k === 'route' ? first.value.split(' ')[1] : first.value }) }),
    });
  };
  if (state.status !== '2xx' && state.status !== '3xx') say('errors');
  say('all');
  if (!total) unknowns.push(filters ? `Nothing matches ${filters}.` : 'No requests have arrived yet.');

  const top = data.rows.slice(0, shown);
  const sort = state.sort === 'at' ? 'received' : state.sort;
  const focus = top.length
    ? `page ${state.page} of ${Math.max(1, Math.ceil(total / data.pageSize))}, sorted by ${sort}, ${state.dir === 'desc' ? 'highest or newest' : 'lowest or oldest'} first; the first ${top.length} shown: ${top.map((r) => `${r.id} ${r.method} ${r.route} ${r.status} ${formatDuration(r.latency)} ${r.customer}`).join('; ')}.`
    : undefined;

  return { view: 'requests', title: 'Requests', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}

/**
 * One request's shared context (decision 0011): what it was, how it ended, and where its time went against what is
 * usual for its route, as both agents read it.
 */
import type { RequestRow, Span } from '@/data/sample';
import { formatDuration, formatPercent } from '@/lib/format';
import { formatDateTime } from '@/lib/format-date';
import type { Insight, SharedContext } from '@/lib/shared-context';

export type RequestData = {
  request: RequestRow;
  trace: Span[];
  /** The route's p95 over the period, for "is this slow?": from the endpoints the Overview and Analytics read. */
  routeP95: number | null;
  statusText: string;
  payloadBytes: { request: number | null; response: number };
  now: string;
};

export function requestContext({ request: r, trace, routeP95, statusText, payloadBytes, now }: RequestData): SharedContext {
  const failed = r.status >= 500 || r.status === 429;
  const total = trace.reduce((m, s) => Math.max(m, s.start + s.duration), 0) || r.latency;
  const insights: Insight[] = [];
  const heaviest = trace.reduce<Span | null>((m, s) => (!m || s.duration > m.duration ? s : m), null);
  if (heaviest) insights.push({ text: `Most of its time went to ${heaviest.name} (${heaviest.detail}): ${formatDuration(heaviest.duration)}, ${formatPercent(heaviest.duration / total, 0)} of ${formatDuration(total)}.` });
  if (routeP95) insights.push({ text: `Its latency is ${(r.latency / routeP95).toFixed(1)}× the p95 of ${r.method} ${r.route} (${formatDuration(routeP95)}): ${r.latency > routeP95 ? 'slower than 95 of 100 requests to this route' : 'within what this route usually takes'}.`, evidence: `/requests?q=${encodeURIComponent(r.route)}` });
  if (failed) insights.push({ text: `It failed (${r.status} ${statusText}), so it counts in the error rate; a person can replay it from this page.`, evidence: `/requests?q=${encodeURIComponent(r.customer)}&status=${r.status === 429 ? '4xx' : '5xx'}` });
  if (r.replayOf) insights.push({ text: `It replays ${r.replayOf}.`, evidence: `/requests/${r.replayOf}` });
  return {
    view: 'request',
    title: `Request ${r.id}`,
    address: `/requests/${r.id}`,
    scope: `one request, received ${formatDateTime(r.at)} UTC`,
    facts: [
      { label: 'Request', value: `${r.method} ${r.route}${r.model ? `, served by ${r.model}` : ''}` },
      { label: 'Status', value: `${r.status} ${statusText}` },
      { label: 'Latency', value: formatDuration(r.latency), definition: 'From arrival at the gateway to the last byte sent.' },
      { label: 'Customer and region', value: `${r.customer}, ${r.region}` },
      { label: 'Phases', value: trace.map((s) => `${s.name} ${formatDuration(s.duration)} from ${formatDuration(s.start)}`).join('; ') },
      { label: 'Payloads', value: `request ${payloadBytes.request === null ? 'none' : `${payloadBytes.request} characters`}, response ${payloadBytes.response} characters; their text is on the page` },
    ],
    insights,
    unknowns: [`One request is one sample: whether its route is slow or failing in general is on the request log, not here. Replaying a request is the person's to do on this page; an agent cannot.`],
    freshness: `Read ${formatDateTime(now)} UTC.`,
  };
}

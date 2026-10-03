/**
 * Relay's records for the list and detail pages: a request's trace and payloads, the workspace's API keys, and the
 * facts behind each customer. Deterministic, derived from ./relay so the numbers agree.
 */
import { CUSTOMER_ROWS, DEMO_NOW, REQUESTS, type RequestRow } from '@/system/fixtures/relay';

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';
export const statusClass = (s: number): StatusClass => (s >= 500 ? '5xx' : s >= 400 ? '4xx' : s >= 300 ? '3xx' : '2xx');
export const statusTone = (s: number) => (s >= 500 ? 'critical' : s === 429 ? 'warning' : s >= 400 ? 'warning' : 'positive') as 'critical' | 'warning' | 'positive';
export const STATUS_TEXT: Record<number, string> = { 200: 'OK', 201: 'Created', 400: 'Bad request', 404: 'Not found', 429: 'Rate limited', 500: 'Server error', 503: 'Unavailable' };

export function requestById(id: string): RequestRow | undefined {
  return REQUESTS.find((r) => r.id === id);
}

/** The ids the detail route builds ahead of time; any other id still renders on demand. */
export const FEATURED_REQUEST_IDS = REQUESTS.slice(0, 12).map((r) => r.id);

export type Span = { name: string; detail: string; start: number; duration: number; tone?: 'accent' | 'neutral' | 'critical' };

/** A request's phases, in milliseconds from arrival: the waterfall on the detail page. */
export function traceOf(r: RequestRow): Span[] {
  const L = r.latency;
  const failed = r.status >= 500;
  const limited = r.status === 429;
  const gateway = Math.max(3, Math.round(L * 0.04));
  const auth = Math.max(2, Math.round(L * 0.03));
  if (limited || r.status === 404 || r.status === 400) {
    return [
      { name: 'Gateway', detail: `TLS and routing in ${r.region}`, start: 0, duration: gateway, tone: 'neutral' },
      { name: 'Auth', detail: 'Key and scope check', start: gateway, duration: auth, tone: 'neutral' },
      { name: limited ? 'Rate limit' : 'Validation', detail: limited ? 'Over 1,200 requests a minute' : 'Rejected before the model', start: gateway + auth, duration: Math.max(1, L - gateway - auth), tone: 'critical' },
    ];
  }
  const queue = Math.round(L * 0.08);
  const model = Math.round(L * (failed ? 0.7 : 0.55));
  const stream = Math.max(1, L - gateway - auth - queue - model);
  return [
    { name: 'Gateway', detail: `TLS and routing in ${r.region}`, start: 0, duration: gateway, tone: 'neutral' },
    { name: 'Auth', detail: 'Key and scope check', start: gateway, duration: auth, tone: 'neutral' },
    { name: 'Queue', detail: 'Waiting for capacity', start: gateway + auth, duration: queue, tone: 'neutral' },
    { name: 'Model', detail: r.model, start: gateway + auth + queue, duration: model, tone: failed ? 'critical' : 'accent' },
    { name: failed ? 'Error' : 'Stream', detail: failed ? 'Upstream timed out' : 'Response streamed', start: gateway + auth + queue + model, duration: stream, tone: failed ? 'critical' : 'neutral' },
  ];
}

export function payloadsOf(r: RequestRow) {
  const request = r.route.startsWith('/v1/messages')
    ? { model: r.model, max_tokens: 1024, messages: [{ role: 'user', content: 'Summarise the incident report for the on-call channel.' }] }
    : r.route.startsWith('/v1/search')
      ? { query: 'refund policy for annual plans', top_k: 8 }
      : r.route.startsWith('/v1/embeddings')
        ? { model: 'relay-embed', input: ['Quarterly revenue grew 12%', 'Churn fell to 2.1%'] }
        : { id: r.id.slice(4) };
  const response = r.status >= 400
    ? { error: { type: STATUS_TEXT[r.status]?.toLowerCase().replace(/ /g, '_') ?? 'error', message: r.status === 429 ? 'Rate limit of 1,200 requests per minute exceeded. Retry after 12 seconds.' : 'The request could not be completed.' } }
    : { id: `msg_${r.id.slice(4, 12)}`, status: 'completed', usage: { input_tokens: 412, output_tokens: Math.round(r.bytes / 40) } };
  return { request: JSON.stringify(request, null, 2), response: JSON.stringify(response, null, 2) };
}

export type ApiKey = { id: string; name: string; secret: string; owner: string; created: string; lastUsed: string | null; scopes: string[]; env: 'live' | 'test' };
const ago = (days: number, hours = 0) => new Date(DEMO_NOW.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();
export const API_KEYS: ApiKey[] = [
  { id: 'key_01', name: 'Production backend', secret: 'rly_live_4f9a2c71e8b04d6f93a1c5e2d7b8f601', owner: 'Maya Chen', created: ago(212), lastUsed: ago(0, 0.02), scopes: ['messages', 'search', 'embeddings'], env: 'live' },
  { id: 'key_02', name: 'Search indexer', secret: 'rly_live_9b3e1d55a7c24f08b6e2a9d1c4f7e830', owner: 'Jonas Weber', created: ago(141), lastUsed: ago(0, 0.4), scopes: ['embeddings', 'files'], env: 'live' },
  { id: 'key_03', name: 'Support assistant', secret: 'rly_live_2c8d4a96f1e34b7a85d0c3e9b6a2f417', owner: 'Amara Okafor', created: ago(63), lastUsed: ago(0, 3), scopes: ['messages'], env: 'live' },
  { id: 'key_04', name: 'Staging', secret: 'rly_test_7e1f3b29c5d84a60b2f9e8c1d3a7b552', owner: 'Jonas Weber', created: ago(30), lastUsed: ago(2), scopes: ['messages', 'search', 'embeddings', 'files', 'webhooks'], env: 'test' },
  { id: 'key_05', name: 'Load test, October', secret: 'rly_test_5a0c9e17b3f24d8e91c6a2b7f4d0e389', owner: 'Maya Chen', created: ago(1), lastUsed: null, scopes: ['messages'], env: 'test' },
];

export type CustomerRecord = (typeof CUSTOMER_ROWS)[number] & { id: string; region: string; since: string; errorRate: number; seats: number };
export const CUSTOMERS: CustomerRecord[] = CUSTOMER_ROWS.map((c, i) => ({
  ...c,
  id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
  region: ['us-east-1', 'eu-west-1', 'us-east-1', 'ap-southeast-1', 'eu-west-1', 'us-west-2'][i % 6],
  since: ago(30 + i * 47),
  errorRate: [0.004, 0.0021, 0.0063, 0.0012, 0.0094, 0.0031, 0.0018, 0.0142, 0.0027, 0.0056, 0.0009, 0.0038][i % 12],
  seats: [148, 96, 74, 41, 33, 27, 22, 18, 12, 9, 6, 3][i % 12],
}));

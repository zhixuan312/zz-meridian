/**
 * The sample's records for the list and detail pages: a request's trace and payloads, the workspace's API keys, and the
 * facts behind each customer. Deterministic, derived from ./sample so the numbers agree.
 */
import { CUSTOMER_ROWS, DEMO_NOW, REQUESTS, type RequestRow } from '@/system/fixtures/sample';

type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';
export const statusClass = (s: number): StatusClass => (s >= 500 ? '5xx' : s >= 400 ? '4xx' : s >= 300 ? '3xx' : '2xx');
export const statusTone = (s: number) => (s >= 500 ? 'critical' : s === 429 ? 'warning' : s >= 400 ? 'warning' : 'neutral') as 'critical' | 'warning' | 'neutral';
export const STATUS_TEXT: Record<number, string> = { 200: 'OK', 201: 'Created', 400: 'Bad request', 404: 'Not found', 429: 'Rate limited', 500: 'Server error', 503: 'Unavailable' };

/** The ids the detail route builds ahead of time; any other id still renders on demand. */
export const FEATURED_REQUEST_IDS = REQUESTS.slice(0, 12).map((r) => r.id);

export type Span = { name: string; detail: string; start: number; duration: number; tone?: 'accent' | 'neutral' | 'critical' };

/** What each route does between auth and the response: the phase the request's time mostly goes to. */
const WORK: Record<string, { name: string; detail: (r: RequestRow) => string; last: string }> = {
  '/v1/messages': { name: 'Model', detail: (r) => r.model ?? '', last: 'Response streamed' },
  '/v1/embeddings': { name: 'Model', detail: () => 'meridian-embed', last: 'Vectors returned' },
  '/v1/search': { name: 'Search', detail: () => 'Top 8 across the index', last: 'Results returned' },
  '/v1/documents/:id': { name: 'Storage', detail: () => 'Read from the document store', last: 'Document returned' },
  '/v1/files': { name: 'Parse', detail: () => 'Scanned, parsed and stored', last: 'File record returned' },
  '/v1/sessions/:id': { name: 'Storage', detail: () => 'Session revoked', last: 'Confirmation returned' },
  '/v1/webhooks/:id': { name: 'Storage', detail: () => 'Endpoint updated', last: 'Endpoint returned' },
};

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
      {
        name: limited ? 'Rate limit' : r.status === 404 ? 'Lookup' : 'Validation',
        detail: limited ? 'Over 1,200 requests a minute' : r.status === 404 ? 'No record with that ID' : 'Rejected before any work',
        start: gateway + auth, duration: Math.max(1, L - gateway - auth), tone: 'critical',
      },
    ];
  }
  const work = WORK[r.route];
  const queue = Math.round(L * 0.08);
  const main = Math.round(L * (failed ? 0.7 : 0.55));
  const last = Math.max(1, L - gateway - auth - queue - main);
  return [
    { name: 'Gateway', detail: `TLS and routing in ${r.region}`, start: 0, duration: gateway, tone: 'neutral' },
    { name: 'Auth', detail: 'Key and scope check', start: gateway, duration: auth, tone: 'neutral' },
    { name: 'Queue', detail: 'Waiting for capacity', start: gateway + auth, duration: queue, tone: 'neutral' },
    { name: work.name, detail: work.detail(r), start: gateway + auth + queue, duration: main, tone: failed ? 'critical' : 'accent' },
    { name: failed ? 'Error' : 'Respond', detail: failed ? 'Upstream timed out' : work.last, start: gateway + auth + queue + main, duration: last, tone: failed ? 'critical' : 'neutral' },
  ];
}

/**
 * What a request used and cost at the sample's list price: tokens at $3 in and $15 out per million on the model routes,
 * and $0.10 per thousand calls on the rest. A refused request used nothing; `tokens` is null where no model ran.
 */
export function usageOf(r: RequestRow) {
  if (r.status >= 400) return { tokens: null, cost: 0 };
  if (r.route === '/v1/messages') {
    const input = 412, output = Math.round(r.bytes / 40);
    return { tokens: { input, output }, cost: (input * 3 + output * 15) / 1_000_000 };
  }
  if (r.route === '/v1/embeddings') return { tokens: { input: 18, output: 0 }, cost: (18 * 3) / 1_000_000 };
  return { tokens: null, cost: 0.0001 };
}

const tail = (r: RequestRow, n = 8) => r.id.slice(4, 4 + n);

/** The bodies, as the API would have seen them. GET and DELETE carry none: `request` is null. */
export function payloadsOf(r: RequestRow): { request: string | null; response: string } {
  const request =
    r.route === '/v1/messages' ? { model: r.model, max_tokens: 1024, messages: [{ role: 'user', content: 'Summarise the incident report for the on-call channel.' }] }
    : r.route === '/v1/embeddings' ? { model: 'meridian-embed', input: ['Quarterly revenue grew 12%', 'Churn fell to 2.1%'] }
    : r.route === '/v1/files' ? { purpose: 'retrieval', filename: 'q3-board-pack.pdf' }
    : r.route === '/v1/webhooks/:id' ? { url: 'https://hooks.northwind.example/meridian', events: ['request.failed', 'key.revoked'] }
    : null;
  const usage = usageOf(r);
  const ok =
    r.route === '/v1/messages' ? { id: `msg_${tail(r)}`, status: 'completed', usage: { input_tokens: usage.tokens?.input, output_tokens: usage.tokens?.output } }
    : r.route === '/v1/embeddings' ? { object: 'list', dimensions: 1024, data: [{ index: 0, embedding: [0.0123, -0.0841, 0.0377, 0.0062] }, { index: 1, embedding: [-0.0219, 0.0652, 0.0094, -0.0418] }], usage: { input_tokens: 18 } }
    : r.route === '/v1/search' ? { results: [{ id: 'doc_7f2a91', title: 'Refunds on annual plans', score: 0.92 }, { id: 'doc_3c81e0', title: 'Billing FAQ', score: 0.81 }], total: 8 }
    : r.route === '/v1/documents/:id' ? { id: `doc_${tail(r, 6)}`, title: 'Q3 incident review', updated_at: '2026-10-02T16:41:00Z', size_bytes: r.bytes }
    : r.route === '/v1/files' ? { id: `file_${tail(r)}`, filename: 'q3-board-pack.pdf', bytes: r.bytes, status: 'processed' }
    : r.route === '/v1/sessions/:id' ? { id: `ses_${tail(r)}`, deleted: true }
    : { id: `wh_${tail(r, 6)}`, url: 'https://hooks.northwind.example/meridian', events: ['request.failed', 'key.revoked'], enabled: true };
  const response = r.status >= 400
    ? { error: { type: STATUS_TEXT[r.status]?.toLowerCase().replace(/ /g, '_') ?? 'error', message: r.status === 429 ? 'Rate limit of 1,200 requests per minute exceeded. Retry after 12 seconds.' : r.status === 404 ? 'No record with that ID.' : 'The request could not be completed.' } }
    : ok;
  return { request: request ? JSON.stringify(request, null, 2) : null, response: JSON.stringify(response, null, 2) };
}

/**
 * An API key as it is stored: never the secret itself. `hint` is the non-secret part a person recognises the key by (its
 * prefix and last four characters), and `secretHash` is what a request's key is checked against. The full secret exists
 * once, in what `createKey` returns.
 */
export type ApiKey = { id: string; name: string; hint: string; secretHash: string; owner: string; created: string; lastUsed: string | null; scopes: string[]; env: 'live' | 'test' };
const ago = (days: number, hours = 0) => new Date(DEMO_NOW.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();
export const API_KEYS: ApiKey[] = [
  { id: 'key_01', name: 'Production backend', hint: 'zzm_live_…f601', secretHash: 'a70b9eb5972206dad7965842f9c1a020b6fbd671f95ff4d90e04f31440a0767c', owner: 'Maya Chen', created: ago(212), lastUsed: ago(0, 0.02), scopes: ['messages', 'search', 'embeddings'], env: 'live' },
  { id: 'key_02', name: 'Search indexer', hint: 'zzm_live_…e830', secretHash: 'c5e3a95789cd465edf1a812638689aec44e22c712ddf8aebd143f92db44ec2c9', owner: 'Jonas Weber', created: ago(141), lastUsed: ago(0, 0.4), scopes: ['embeddings', 'files'], env: 'live' },
  { id: 'key_03', name: 'Support assistant', hint: 'zzm_live_…f417', secretHash: '645516307926d8cf8f1a4ffc7706ff525379e0bd50f143b672b537a1b84a605e', owner: 'Amara Okafor', created: ago(63), lastUsed: ago(0, 3), scopes: ['messages'], env: 'live' },
  { id: 'key_04', name: 'Staging', hint: 'zzm_test_…b552', secretHash: 'b7caa2d349c1e2bc72d6d1c80e09c7f20a99e1d86580f5b9c058cdc9aaeb784c', owner: 'Jonas Weber', created: ago(30), lastUsed: ago(2), scopes: ['messages', 'search', 'embeddings', 'files', 'webhooks'], env: 'test' },
  { id: 'key_05', name: 'Load test, October', hint: 'zzm_test_…e389', secretHash: 'cb3e8f7c3409619a25c56b233f885082c1ddfda97d99aa4a60eba6ddca281440', owner: 'Maya Chen', created: ago(1), lastUsed: null, scopes: ['messages'], env: 'test' },
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

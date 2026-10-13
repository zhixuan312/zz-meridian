/**
 * The sample product: this template presented as a fictional API platform under the name in app.config, so the template's pages, the Design Atlas and every card preview
 * run with no backend and look like a real product.
 *
 * Every customer, person, region and incident in it is invented: Northwind Labs, Parallax AI, Maya Chen and the rest
 * name nobody this work came from, and a name that matches a real company does so by chance. Plausible names keep the
 * examples readable, as a placeholder like "Customer 1" would not (issue #14).
 *
 * It is not your data seam. A product built on the template reads its own module in src/data/ and leaves this one in
 * place for the Atlas and the previews.
 *
 * Deterministic on purpose: a seeded generator and a fixed clock, so the server and the client render the same
 * numbers (Math.random() would be a hydration mismatch that looks like a framework bug).
 *
 * This module holds the clock, the names, the shapes and the prices, and the records of the request log, the services,
 * the incidents and the activity. The company's own records (its days, its usage, its compute and its customers) are
 * made in ./company, which no client module of a page imports: tests/client-imports.test.ts walks their imports and
 * fails if one does.
 */
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service, ServiceStatus } from '@/components/patterns/status-list';
import { app } from '@/app.config';

export const DEMO_NOW = new Date('2026-10-03T09:00:00Z');
/** When the pipeline last delivered. A real app reads the newest ingest time, never now(). */
export const DEMO_UPDATED_AT = new Date(DEMO_NOW.getTime() - 4 * 60_000);

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DAY = 86_400_000;

export const PLANS = ['Enterprise', 'Scale', 'Starter'] as const;
export type Plan = (typeof PLANS)[number];

/** One day (UTC): a complete one, or the day in progress with what has arrived so far. `revenue` is what customers paid for that day's tokens and calls, in US dollars. */
export type DailyPoint = { date: string; requests: number; errors: number; p95: number; tokens: number; revenue: number; revenueByPlan: Record<Plan, number> };
export type Totals = { requests: number; errorRate: number; p95: number; revenue: number };
export type Endpoint = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; route: string; requests: number; errorRate: number; p95: number };

/** What the product sells. A price is in US dollars: a million tokens for a model, one call for `none`; null where there is none. */
export type Model = { id: string; label: string; serves: string; inputPrice: number | null; outputPrice: number | null; callPrice: number | null };
/** The one place money comes from: three models priced by the token, and the calls that reach no model priced by the call. */
export const MODELS: Model[] = [
  { id: 'meridian-large', label: 'Meridian Large', serves: '/v1/messages', inputPrice: 2, outputPrice: 10, callPrice: null },
  { id: 'meridian-swift', label: 'Meridian Swift', serves: '/v1/messages', inputPrice: 0.5, outputPrice: 2.5, callPrice: null },
  { id: 'meridian-embed', label: 'Meridian Embed', serves: '/v1/embeddings', inputPrice: 0.1, outputPrice: null, callPrice: null },
  { id: 'none', label: 'No model', serves: 'every other route', inputPrice: null, outputPrice: null, callPrice: 0.0001 },
];
/** Whether the model a request reached writes tokens: only then has an answer a first token, a rate and a price for its output. */
export const writesTokens = (model: string | null) => MODELS.some((m) => m.id === model && m.outputPrice !== null);

/** A model's day: what it answered, the tokens it read and wrote, and what that was paid. `ttft` and `tps` are null for a model that writes no tokens. */
export type UsageRow = { id: string; date: string; model: string; requests: number; inputTokens: number; outputTokens: number; revenue: number; errors: number; p95: number; ttft: number | null; tps: number | null };
/** A region's day: the GPUs provisioned, and the GPU-hours used of the `gpus` x 24 they offered. */
export type ComputeRow = { id: string; date: string; region: string; gpus: number; used: number };
/** What a day's compute cost, in US dollars. */
export type CostRow = { date: string; compute: number };

/**
 * A customer. `revenue`, `requests`, `tokens` and `byEndpoint` cover the last 30 complete days and `trend` the last 14;
 * every date is a day, YYYY-MM-DD. A customer that has left keeps its record and is counted in no figure.
 */
export type CustomerRecord = {
  id: string; name: string; plan: Plan; status: 'active' | 'trial' | 'past due' | 'left';
  requests: number; tokens: number; revenue: number; byEndpoint: Record<string, number>; trend: number[];
  errorRate: number; seats: number; region: string; owner: string;
  joined: string; planSince: string | null; previousPlan: Plan | null; left: string | null; trialEnds: string | null; pastDueSince: string | null;
};

/** The seven endpoints, busiest first, each with the latency p95 (ms) that is usual for it. */
export const ROUTES: Pick<Endpoint, 'method' | 'route' | 'p95'>[] = [
  { method: 'POST', route: '/v1/messages', p95: 612 },
  { method: 'GET', route: '/v1/search', p95: 188 },
  { method: 'POST', route: '/v1/embeddings', p95: 241 },
  { method: 'GET', route: '/v1/documents/:id', p95: 96 },
  { method: 'POST', route: '/v1/files', p95: 1420 },
  { method: 'DELETE', route: '/v1/sessions/:id', p95: 74 },
  { method: 'PUT', route: '/v1/webhooks/:id', p95: 132 },
];

/** The four regions, largest first: the order every list draws them in. */
export const REGION_NAMES = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2'];

/** The twelve customers every release has named, largest first: three on Enterprise, five on Scale and four on Starter. A request of the log names one of them. */
export const NAMED_CUSTOMERS = ['Northwind Labs', 'Halcyon Health', 'Atlas Freight', 'Mosaic Learning', 'Quill & Co', 'Parallax AI', 'Fernway Bank', 'Orbit Retail', 'Tessellate', 'Lumen Studio', 'Kestrel Systems', 'Brightline'];

export type RequestRow = {
  id: string; at: string; method: string; route: string; status: number; latency: number;
  customer: string; region: string; bytes: number;
  /** The request this one replays, when a person sent a failed request again from its page. */
  replayOf?: string | null;
  /** The model that served it: only /v1/messages and /v1/embeddings call one. */
  model: string | null;
  /** Milliseconds from arrival to the first token of the answer, never more than `latency`: null where no model wrote one, because the request reached none, reached the embedding model, or was refused. */
  ttft: number | null;
};

const modelFor = (route: string, r: number) =>
  route === '/v1/messages' ? (r < 0.6 ? 'meridian-large' : 'meridian-swift') : route === '/v1/embeddings' ? 'meridian-embed' : null;

/**
 * The request log: a sample of the requests received. It holds 240 of the last hour and a half, a small part of what
 * the company answered in that time.
 */
export const REQUESTS: RequestRow[] = (() => {
  const rand = seeded(0xc0ffee);
  // The first token's draw has a generator of its own, so the log's ids and every other field stay what they were.
  const first = seeded(0xf1257);
  const rows: RequestRow[] = [];
  let t = DEMO_NOW.getTime() - 40_000;
  for (let i = 0; i < 240; i++) {
    t -= Math.round(4_000 + rand() * 40_000);
    const { method, route, p95: base } = ROUTES[Math.floor(rand() ** 1.6 * ROUTES.length)];
    const r = rand();
    const status = r > 0.985 ? 503 : r > 0.97 ? 500 : r > 0.93 ? 429 : r > 0.9 ? (route.endsWith(':id') ? 404 : 400) : r > 0.88 ? 400 : method === 'POST' ? 201 : 200;
    const row: Omit<RequestRow, 'ttft'> = {
      id: 'req_' + Math.floor(rand() * 36 ** 8).toString(36).padStart(8, '0') + Math.floor(rand() * 36 ** 4).toString(36),
      at: new Date(t).toISOString(),
      method, route, status,
      latency: Math.round(base * (0.25 + rand() ** 2 * 1.1) * (status >= 500 ? 3 : 1)),
      customer: NAMED_CUSTOMERS[Math.floor(rand() ** 1.3 * NAMED_CUSTOMERS.length)],
      region: REGION_NAMES[Math.floor(rand() ** 1.5 * REGION_NAMES.length)],
      // An error answers with a short JSON body; a success with whatever the route returns.
      bytes: ((b) => (status >= 400 ? Math.round(160 + b * 240) : Math.round(400 + b ** 3 * 220_000)))(rand()),
      model: modelFor(route, rand()),
    };
    // A model that writes tokens streams them, and the first comes a quarter to a half of the way through. The embedding
    // model writes none, so its requests have no first token, as its rows of usage have none; nor has a request that
    // reached no model or was refused.
    const share = 0.22 + first() * 0.26;
    rows.push({ ...row, ttft: writesTokens(row.model) && status < 400 ? Math.max(1, Math.round(row.latency * share)) : null });
  }
  return rows;
})();

/**
 * What a day below operational costs a service, in minutes of the day's 1,440: the one rule an uptime is worked out by.
 * A day of outage costs two hours, so no strip of days, however marked, reads 90% or less.
 */
const MINUTES_LOST: Record<ServiceStatus, number> = { operational: 0, degraded: 30, outage: 120 };

/** A service's uptime over its days, to five decimals: 1 less what its marked days cost, so it is 1 exactly when no day carries a mark. */
export const uptimeOf = (days: ServiceStatus[]) => Math.round((1 - days.reduce((lost, d) => lost + MINUTES_LOST[d], 0) / (days.length * 1_440)) * 100_000) / 100_000;

/** name, description, state now, latency now (ms). */
const MONITORED: [string, string, ServiceStatus, number][] = [
  ['Edge gateway', 'TLS termination, routing and rate limits', 'operational', 38],
  ['Inference API', 'Messages, completions and tools', 'degraded', 612],
  ['Embeddings', 'Vectors for search and retrieval', 'operational', 241],
  ['Files', 'Uploads, parsing and storage', 'operational', 1420],
  ['Webhooks', 'Delivery of events to customer endpoints', 'operational', 132],
  ['Dashboard', 'This console', 'operational', 84],
];

/**
 * The monitored services, each with its last 90 days, oldest first. The last day is the day in progress and is the
 * service's state now. The three complete days the company was outside its band (./company) are each marked: the
 * Inference API 12 and 11 days before the clock, and Files 47 days before.
 */
export const SERVICES: Service[] = MONITORED.map(([name, description, status, latency], i) => {
  const rand = seeded(i * 31 + 3);
  const days: ServiceStatus[] = Array.from({ length: 90 }, (_, d) => {
    if (d === 89) return status;
    if (status === 'degraded' && (d === 78 || d === 77)) return 'degraded';
    if (i === 3 && d === 42) return 'outage';
    return rand() > 0.985 ? 'degraded' : 'operational';
  });
  return { name, description, status, uptime: uptimeOf(days), latency, days };
});

/**
 * An incident as the product records it: what the Incident card draws of it, who has it (a member's name) and the
 * ticket its work is tracked in (a ticket's id), each null when there is none. The card takes a ticket as a title and
 * an address, so a page that draws the ticket's line joins them from the id.
 */
export type IncidentRecord = Omit<Incident, 'owner' | 'ticket'> & { owner: string | null; ticketId: string | null };

/** The open incident, whose ticket names it back (./sample-engineering), and the latest one resolved. */
export const INCIDENTS: IncidentRecord[] = [
  {
    id: 'inc_2610', title: 'Elevated latency on Inference API in eu-west-1', service: 'Inference API', severity: 'minor', state: 'monitoring',
    owner: 'Jonas Weber', ticketId: 'tickets_1',
    started: new Date(DEMO_NOW.getTime() - 3.2 * 3600_000).toISOString(),
    updates: [
      { at: new Date(DEMO_NOW.getTime() - 3.2 * 3600_000).toISOString(), text: 'p95 latency above 900ms for requests routed through eu-west-1. Investigating.' },
      { at: new Date(DEMO_NOW.getTime() - 2.1 * 3600_000).toISOString(), text: 'Traffic shifted to eu-central-1. Latency is recovering.' },
      { at: new Date(DEMO_NOW.getTime() - 0.6 * 3600_000).toISOString(), text: 'p95 back under 650ms. Monitoring before we close this.' },
    ],
  },
  {
    id: 'inc_2598', title: 'Upload failures for files over 50 MB', service: 'Files', severity: 'major', state: 'resolved',
    owner: 'Priya Nair', ticketId: null,
    started: new Date(DEMO_NOW.getTime() - 47 * DAY).toISOString(), resolved: new Date(DEMO_NOW.getTime() - 47 * DAY + 2.4 * 3600_000).toISOString(),
    updates: [{ at: new Date(DEMO_NOW.getTime() - 47 * DAY).toISOString(), text: 'Multipart uploads over 50 MB returned 500. Rolled back the parser release.' }],
  },
];

export const ACTIVITY: ActivityEvent[] = [
  { id: 'e1', at: new Date(DEMO_NOW.getTime() - 9 * 60_000).toISOString(), actor: 'Maya Chen', verb: 'rotated', object: 'the production signing key' },
  { id: 'e2', at: new Date(DEMO_NOW.getTime() - 36 * 60_000).toISOString(), actor: app.name, system: true, verb: 'shifted traffic', object: 'from eu-west-1 to eu-central-1', tone: 'warning' },
  { id: 'e3', at: new Date(DEMO_NOW.getTime() - 2.4 * 3600_000).toISOString(), actor: 'Jonas Weber', via: 'Claude', verb: 'raised the rate limit for', object: 'Parallax AI to 2,000 rpm' },
  { id: 'e4', at: new Date(DEMO_NOW.getTime() - 5.1 * 3600_000).toISOString(), actor: app.name, system: true, verb: 'deployed', object: 'gateway v4.18.2', tone: 'positive' },
  { id: 'e5', at: new Date(DEMO_NOW.getTime() - 26 * 3600_000).toISOString(), actor: 'Amara Okafor', verb: 'invited', object: 'two people' },
];

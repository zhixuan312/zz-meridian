/**
 * The sample product: this template presented as a fictional API platform under the name in app.config, so the template's pages, the Design Atlas and every card preview
 * run with no backend and look like a real product.
 *
 * It is not your data seam. A product built on the template reads its own module in src/data/ and leaves this one in
 * place for the Atlas and the previews.
 *
 * Deterministic on purpose: a seeded generator and a fixed clock, so the server and the client render the same
 * numbers (Math.random() would be a hydration mismatch that looks like a framework bug).
 */
import { PERIOD_DAYS, type Period } from '@/lib/period';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service, ServiceStatus } from '@/components/patterns/status-list';
import { app } from '@/app.config';

export const DEMO_NOW = new Date('2026-10-03T09:00:00Z');
/** When the pipeline last delivered. A real app reads the newest ingest time, never now(). */
export const DEMO_UPDATED_AT = new Date(DEMO_NOW.getTime() - 4 * 60_000);
export const DEMO_STALE_AFTER_MS = 15 * 60_000;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysOf = (p: Period) => PERIOD_DAYS[p] ?? 180;

export type DailyPoint = { date: string; requests: number; errors: number; p95: number; spend: number };

/** One point per day, oldest first; `days` more before them, for the previous period. */
function daily(days: number): DailyPoint[] {
  const rand = seeded(0x5eed);
  const out: DailyPoint[] = [];
  const total = 360;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(DEMO_NOW.getTime() - i * DAY);
    const wd = d.getUTCDay();
    const weekly = wd === 0 ? 0.46 : wd === 6 ? 0.52 : wd === 1 ? 0.94 : 1;
    const growth = 1 + (total - i) / 520;
    const wave = 1 + 0.08 * Math.sin((total - i) / 9);
    const requests = Math.round(68_000 * weekly * growth * wave * (0.9 + rand() * 0.2));
    const incident = i === 11 || i === 12 ? 3.4 : i === 47 ? 2.2 : 1;
    const errRate = (0.0062 + rand() * 0.0035) * incident;
    out.push({
      date: iso(d),
      requests,
      errors: Math.round(requests * errRate),
      p95: Math.round((268 + rand() * 70 + (incident > 1 ? 190 : 0)) * (wd === 0 || wd === 6 ? 0.9 : 1)),
      spend: Math.round(requests * 0.000102 * (0.94 + rand() * 0.12) * 100) / 100,
    });
  }
  return out.slice(-days * 2);
}

export function demoSeries(period: Period) {
  const days = daysOf(period);
  const all = daily(days);
  return { current: all.slice(-days), previous: all.slice(0, all.length - days) };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * q)];

export type Totals = { requests: number; errorRate: number; p95: number; spend: number };
function totals(points: DailyPoint[]): Totals {
  const requests = sum(points.map((p) => p.requests));
  return {
    requests,
    errorRate: sum(points.map((p) => p.errors)) / requests,
    p95: pct(points.map((p) => p.p95), 0.5),
    spend: Math.round(sum(points.map((p) => p.spend)) * 100) / 100,
  };
}

export function demoTotals(period: Period) {
  const { current, previous } = demoSeries(period);
  return { current: totals(current), previous: totals(previous) };
}

export type Endpoint = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; route: string; requests: number; errorRate: number; p95: number };
export const ENDPOINTS: Endpoint[] = [
  { method: 'POST', route: '/v1/messages', requests: 1_284_120, errorRate: 0.0041, p95: 612 },
  { method: 'GET', route: '/v1/search', requests: 846_300, errorRate: 0.0022, p95: 188 },
  { method: 'POST', route: '/v1/embeddings', requests: 512_840, errorRate: 0.0035, p95: 241 },
  { method: 'GET', route: '/v1/documents/:id', requests: 301_910, errorRate: 0.0011, p95: 96 },
  { method: 'POST', route: '/v1/files', requests: 120_450, errorRate: 0.0188, p95: 1420 },
  { method: 'DELETE', route: '/v1/sessions/:id', requests: 48_230, errorRate: 0.0009, p95: 74 },
  { method: 'PUT', route: '/v1/webhooks/:id', requests: 21_070, errorRate: 0.0064, p95: 132 },
];

/** Response classes for the period: the composition bar. */
export const STATUS_MIX = [
  { label: '2xx', value: 2_942_310 },
  { label: '3xx', value: 61_420 },
  { label: '4xx', value: 117_840 },
  { label: '5xx', value: 13_350 },
];

export const REGIONS = [
  { label: 'us-east-1', value: 1_402_000 },
  { label: 'eu-west-1', value: 912_400 },
  { label: 'ap-southeast-1', value: 538_100 },
  { label: 'us-west-2', value: 282_420 },
];

/** Requests by weekday (Mon first) and hour (UTC). */
export function demoHeatmap(): number[][] {
  const rand = seeded(0xbeef);
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const weekday = d < 5 ? 1 : 0.42;
      const office = Math.exp(-((h - 14.5) ** 2) / 22) * 0.9 + Math.exp(-((h - 3) ** 2) / 10) * 0.28;
      return Math.round(4200 * weekday * (0.12 + office) * (0.86 + rand() * 0.28));
    }),
  );
}

const CUSTOMERS = ['Northwind Labs', 'Halcyon Health', 'Atlas Freight', 'Mosaic Learning', 'Quill & Co', 'Parallax AI', 'Fernway Bank', 'Orbit Retail', 'Tessellate', 'Lumen Studio', 'Kestrel Systems', 'Brightline'];
const ROUTES = ENDPOINTS.map((e) => [e.method, e.route] as const);
const REGION_IDS = REGIONS.map((r) => r.label);

export type RequestRow = {
  id: string; at: string; method: string; route: string; status: number; latency: number;
  customer: string; region: string; bytes: number; model: string;
};

export const REQUESTS: RequestRow[] = (() => {
  const rand = seeded(0xc0ffee);
  const rows: RequestRow[] = [];
  let t = DEMO_NOW.getTime() - 40_000;
  for (let i = 0; i < 240; i++) {
    t -= Math.round(4_000 + rand() * 40_000);
    const [method, route] = ROUTES[Math.floor(rand() ** 1.6 * ROUTES.length)];
    const r = rand();
    const status = r > 0.985 ? 503 : r > 0.97 ? 500 : r > 0.93 ? 429 : r > 0.9 ? 404 : r > 0.88 ? 400 : method === 'POST' ? 201 : 200;
    const base = ENDPOINTS.find((e) => e.route === route)!.p95;
    rows.push({
      id: 'req_' + Math.floor(rand() * 36 ** 8).toString(36).padStart(8, '0') + Math.floor(rand() * 36 ** 4).toString(36),
      at: new Date(t).toISOString(),
      method, route, status,
      latency: Math.round(base * (0.25 + rand() ** 2 * 1.1) * (status >= 500 ? 3 : 1)),
      customer: CUSTOMERS[Math.floor(rand() ** 1.3 * CUSTOMERS.length)],
      region: REGION_IDS[Math.floor(rand() ** 1.5 * REGION_IDS.length)],
      bytes: Math.round(400 + rand() ** 3 * 220_000),
      model: ['meridian-large', 'meridian-swift', 'meridian-embed'][Math.floor(rand() * 3)],
    });
  }
  return rows;
})();

export type Customer = { name: string; plan: 'Enterprise' | 'Scale' | 'Starter'; requests: number; spend: number; trend: number[]; status: 'active' | 'trial' | 'past due' };
export const CUSTOMER_ROWS: Customer[] = CUSTOMERS.map((name, i) => {
  const rand = seeded(i + 7);
  const scale = Math.round(900_000 / (i + 1.4));
  return {
    name,
    plan: i < 3 ? 'Enterprise' : i < 8 ? 'Scale' : 'Starter',
    requests: scale,
    spend: Math.round(scale * 0.000104 * 100) / 100,
    trend: Array.from({ length: 14 }, (_, d) => Math.round(scale / 30 * (0.8 + rand() * 0.4) * (1 + d / 40))),
    status: i === 9 ? 'past due' : i === 11 ? 'trial' : 'active',
  };
});

export const SERVICES: Service[] = [
  ['Edge gateway', 'TLS termination, routing and rate limits', 'operational', 0.99994, 38],
  ['Inference API', 'Messages, completions and tools', 'degraded', 0.99812, 612],
  ['Embeddings', 'Vectors for search and retrieval', 'operational', 0.99971, 241],
  ['Files', 'Uploads, parsing and storage', 'operational', 0.99902, 1420],
  ['Webhooks', 'Delivery of events to customer endpoints', 'operational', 0.99988, 132],
  ['Dashboard', 'This console', 'operational', 1, 84],
].map(([name, description, status, uptime, latency], i) => {
  const rand = seeded(i * 31 + 3);
  const days: ServiceStatus[] = Array.from({ length: 90 }, (_, d) => {
    if (status === 'degraded' && (d === 89 || d === 78 || d === 77)) return 'degraded';
    if (i === 3 && d === 42) return 'outage';
    return rand() > 0.985 ? 'degraded' : 'operational';
  });
  return { name, description, status, uptime, latency, days } as Service;
});

export const INCIDENTS: Incident[] = [
  {
    id: 'inc_2610', title: 'Elevated latency on Inference API in eu-west-1', service: 'Inference API', severity: 'minor', state: 'monitoring',
    started: new Date(DEMO_NOW.getTime() - 3.2 * 3600_000).toISOString(),
    updates: [
      { at: new Date(DEMO_NOW.getTime() - 3.2 * 3600_000).toISOString(), text: 'p95 latency above 900ms for requests routed through eu-west-1. Investigating.' },
      { at: new Date(DEMO_NOW.getTime() - 2.1 * 3600_000).toISOString(), text: 'Traffic shifted to eu-central-1. Latency is recovering.' },
      { at: new Date(DEMO_NOW.getTime() - 0.6 * 3600_000).toISOString(), text: 'p95 back under 650ms. Monitoring before we close this.' },
    ],
  },
  {
    id: 'inc_2598', title: 'Upload failures for files over 50 MB', service: 'Files', severity: 'major', state: 'resolved',
    started: new Date(DEMO_NOW.getTime() - 47 * DAY).toISOString(), resolved: new Date(DEMO_NOW.getTime() - 47 * DAY + 2.4 * 3600_000).toISOString(),
    updates: [{ at: new Date(DEMO_NOW.getTime() - 47 * DAY).toISOString(), text: 'Multipart uploads over 50 MB returned 500. Rolled back the parser release.' }],
  },
];

export const ACTIVITY: ActivityEvent[] = [
  { id: 'e1', at: new Date(DEMO_NOW.getTime() - 9 * 60_000).toISOString(), actor: 'Maya Chen', verb: 'rotated', object: 'the production signing key' },
  { id: 'e2', at: new Date(DEMO_NOW.getTime() - 36 * 60_000).toISOString(), actor: app.name, system: true, verb: 'shifted traffic', object: 'from eu-west-1 to eu-central-1', tone: 'warning' },
  { id: 'e3', at: new Date(DEMO_NOW.getTime() - 2.4 * 3600_000).toISOString(), actor: 'Jonas Weber', via: 'Claude', verb: 'raised the rate limit for', object: 'Parallax AI to 2,000 rpm' },
  { id: 'e4', at: new Date(DEMO_NOW.getTime() - 5.1 * 3600_000).toISOString(), actor: app.name, system: true, verb: 'deployed', object: 'gateway v4.18.2', tone: 'positive' },
  { id: 'e5', at: new Date(DEMO_NOW.getTime() - 26 * 3600_000).toISOString(), actor: 'Amara Okafor', verb: 'invited', object: 'two people to Workspace' },
];

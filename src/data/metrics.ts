/**
 * The aggregate reads behind the Overview, Analytics and Health: daily totals, endpoints, responses, services,
 * incidents and activity, each through `read()`, so a page, an embed route and a view tool see only what the caller may
 * read (decision 0011). The figures a page shows are computed here from the rows, once, for the person and both agents.
 */
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { read } from '@/data/read';
import type { DailyPoint, Endpoint, Totals } from '@/data/sample';
import { PERIOD_DAYS, type Period } from '@/lib/period';

/** Days in `all`, the sample's longest period. A product with more history raises it, or reads `all` its own way. */
const ALL_DAYS = 180;
/** The newest activity a page shows. */
const ACTIVITY_SHOWN = 6;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** A period's totals from its days: requests, the error rate over them, the median day's p95, and spend. */
function totalsOf(points: DailyPoint[]): Totals {
  const requests = sum(points.map((p) => p.requests));
  const p95 = [...points.map((p) => p.p95)].sort((a, b) => a - b);
  return {
    requests,
    errorRate: requests ? sum(points.map((p) => p.errors)) / requests : 0,
    p95: p95.length ? p95[Math.floor((p95.length - 1) * 0.5)] : 0,
    spend: Math.round(sum(points.map((p) => p.spend)) * 100) / 100,
  };
}

/** The period's days, oldest first, and the same number before them, with both periods' totals. */
export async function readDays(period: Period) {
  const n = PERIOD_DAYS[period] ?? ALL_DAYS;
  const { rows, observedAt } = await read('days', { sort: { field: 'date', dir: 'desc' }, limit: n * 2 });
  const all = (rows as DailyPoint[]).reverse();
  const current = all.slice(-n), previous = all.slice(0, Math.max(0, all.length - n));
  return { series: current, totals: { current: totalsOf(current), previous: totalsOf(previous) }, observedAt };
}

export async function readEndpoints(): Promise<Endpoint[]> {
  const { rows } = await read('endpoints', { sort: { field: 'requests', dir: 'desc' } });
  return (rows as (Endpoint & { id: string })[]).map(({ id: _, ...e }) => e);
}

export async function readResponses(): Promise<{ label: string; value: number }[]> {
  return (await read('responses', { sort: { field: 'label', dir: 'asc' } })).rows as { label: string; value: number }[];
}

export async function readActivity(): Promise<ActivityEvent[]> {
  return (await read('activity', { sort: { field: 'at', dir: 'desc' }, limit: ACTIVITY_SHOWN })).rows as ActivityEvent[];
}

/** Every incident, newest first: the open one, if any, and those resolved. */
export async function readIncidents(): Promise<{ current: Incident | null; past: Incident[]; all: Incident[] }> {
  const all = (await read('incidents', { sort: { field: 'started', dir: 'desc' } })).rows as Incident[];
  return { current: all.find((i) => i.state !== 'resolved') ?? null, past: all.filter((i) => i.state === 'resolved'), all };
}

export async function readServices(): Promise<Service[]> {
  // In the order the team reads its stack, the gateway first, not by name.
  const { rows } = await read('services', { sort: { field: 'order', dir: 'asc' } });
  return (rows as (Service & { order: number })[]).map(({ order: _, ...s }) => s);
}

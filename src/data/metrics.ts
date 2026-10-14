/**
 * The aggregate reads behind the Home, Usage and Services: daily totals, endpoints, responses, services and
 * incidents, each through `read()`, so a page, an embed route and a view tool see only what the caller may
 * read (decision 0011). The figures a page shows are computed here from the rows, once, for the person and both agents.
 */
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { clock } from '@/data/collections';
import { read, readAll } from '@/data/read';
import type { DailyPoint, Endpoint, IncidentRecord, Totals } from '@/data/sample';
import { PERIOD_DAYS, type Period } from '@/lib/period';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** A period's totals from its days: requests, the error rate over them, the median day's p95, and revenue. Home's year reads each of its windows the same way. */
export function totalsOf(points: DailyPoint[]): Totals {
  const requests = sum(points.map((p) => p.requests));
  const p95 = [...points.map((p) => p.p95)].sort((a, b) => a - b);
  return {
    requests,
    errorRate: requests ? sum(points.map((p) => p.errors)) / requests : 0,
    p95: p95.length ? p95[Math.floor((p95.length - 1) * 0.5)] : 0,
    revenue: Math.round(sum(points.map((p) => p.revenue)) * 100) / 100,
  };
}

/** What `readDays` answers: a period's complete days, the days before them, both totals, and the day in progress on its own. */
type PeriodDays = { series: DailyPoint[]; previous: DailyPoint[]; totals: { current: Totals; previous: Totals | null }; running: DailyPoint | null; observedAt: string };

/**
 * A period of days. `series` is the period's complete days, oldest first and ending yesterday: the latest 7, 30 or 90,
 * and for `all` every complete day kept. `previous` is the same number of complete days before them, fewer where fewer
 * are kept and none for `all`; `totals.previous` is null when there are none, so nothing is compared with nothing.
 * `running` is the day in progress, the row of the clock's own date, or null when the latest row is a complete day. It
 * is in no series and no total: it is handed over on its own, for a chart of days to draw as running.
 *
 * Every day kept is read, a page at a time and in the order of its date, so no number stands for `all` and a period is
 * never cut at one read's 500 rows. A product asks its database for the days of the window.
 */
export async function readDays(period: Period): Promise<PeriodDays> {
  const { rows, observedAt } = await readAll('days');
  // The clock's own date, not the read's: a read answered from the cache was made a moment before.
  const today = clock().toISOString().slice(0, 10);
  const days = rows as DailyPoint[];
  const complete = days.filter((d) => d.date < today);
  const n = PERIOD_DAYS[period] ?? complete.length;
  const series = n ? complete.slice(-n) : [], previous = complete.slice(-2 * n, -n);
  return { series, previous, totals: { current: totalsOf(series), previous: previous.length ? totalsOf(previous) : null }, running: days.find((d) => d.date === today) ?? null, observedAt };
}

export async function readEndpoints(): Promise<Endpoint[]> {
  const { rows } = await read('endpoints', { sort: { field: 'requests', dir: 'desc' } });
  return (rows as (Endpoint & { id: string })[]).map(({ id: _, ...e }) => e);
}

/** How many responses each status class had over the window the collection covers, in the order of the classes: 2xx first. */
export async function readResponses(): Promise<{ label: string; value: number }[]> {
  return (await read('responses', { sort: { field: 'label', dir: 'asc' } })).rows as { label: string; value: number }[];
}

/**
 * An incident as a page draws it, in the Incident card's shape: with its owner when it has one. A record's ticket is an
 * id and the card takes a title and an address, so the id is not handed on: a page that draws the ticket's line reads
 * the record and joins the two.
 */
const drawn = ({ ticketId: _, owner, ...incident }: IncidentRecord): Incident => (owner ? { ...incident, owner } : incident);

/** Every incident, newest first: those nobody has resolved (the newest of them is `current`, the one a page leads with) and those resolved. */
export async function readIncidents(): Promise<{ current: Incident | null; open: Incident[]; past: Incident[]; all: Incident[] }> {
  const all = ((await read('incidents', { sort: { field: 'started', dir: 'desc' } })).rows as IncidentRecord[]).map(drawn);
  const open = all.filter((i) => i.state !== 'resolved');
  return { current: open[0] ?? null, open, past: all.filter((i) => i.state === 'resolved'), all };
}

export async function readServices(): Promise<Service[]> {
  // In the order the team reads its stack, the gateway first, not by name.
  const { rows } = await read('services', { sort: { field: 'order', dir: 'asc' } });
  return (rows as (Service & { order: number })[]).map(({ order: _, ...s }) => s);
}

/**
 * What Home states, worked out on the server from what its read could read: the title and the facts of a year, the
 * line under the title, and each part's figures, lines and points (`HomeData`). Pure: it is handed rows and returns
 * figures, so the read in `src/views/tools.ts` and a test build Home the same way, and no row reaches the browser.
 *
 * A read that failed is handed as null: its part is null, `unread` names it, and the rest stands. What compute cost is
 * handed only for a person who may read it; for anyone else it is undefined, and the data has no key for a cost or a
 * margin at all.
 */
import { facts as rules } from '@/app.config';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { ReleaseRow } from '@/data/engineering';
import { totalsOf } from '@/data/metrics';
import type { ComputeRow, CostRow, CustomerRecord, DailyPoint, Endpoint, Model, Ticket, Totals, UsageRow } from '@/data/sample';
import { first, periods, record, steady, total, type Fact } from '@/lib/facts';
import { formatCompact, formatCost, formatDuration, formatPercent, plural } from '@/lib/format';
import { PERIOD_DAYS, type Period } from '@/lib/period';
import { allSentMore, customerFigures, customersAddress, kept, sentMore } from './customers-context';
import { HISTORY_UNREAD, handed, inDays, type PageHead, type ServiceNow } from './fact-insight';
import { INCIDENTS_OPEN, SERVICES_OPERATIONAL, homeLine, homeTitle, unwellNames, type HomeData, type HomeFigure, type HomeWindow, type WorthKnowing } from './home-context';
import type { MainSummary } from './main-summary';
import { releaseMoment, releasesAddress, releaseFigures, stageOf } from './releases-context';
import { ticketCounts } from './tickets-context';

/** The most facts "A year, counted" states, and the most lines worth knowing. */
const YEAR_FACTS = 5;
const WORTH_LINES = 4;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const cents = (n: number) => Math.round(n * 100) / 100;
const count = (n: number) => n.toLocaleString('en-US');
/** A share as the configuration gives it, to the hundredth of a percent: 0.1 is "10%", 0.001 is "0.1%". */
const share = (n: number) => `${Number((n * 100).toFixed(2))}%`;

/** The windows of the year: each whole window of `length` complete days, counted back from the latest, oldest first. */
function windowsOf(history: readonly DailyPoint[], length: number): HomeWindow[] {
  const out: HomeWindow[] = [];
  for (let end = history.length; length > 0 && end - length >= 0; end -= length) {
    const days = history.slice(end - length, end);
    const { requests, p95, revenue } = totalsOf(days);
    out.unshift({ from: days[0].date, to: days[days.length - 1].date, requests, p95, revenue });
  }
  return out;
}

/** The year's card: its windows and its title, which states how requests moved from the first window to the latest and the range of the windows' p95. */
function yearOf(history: readonly DailyPoint[], period: Period): NonNullable<HomeData['year']> {
  const windows = windowsOf(history, PERIOD_DAYS[period] ?? history.length);
  if (windows.length < 2) return { title: 'Requests and latency, a period at a time', windows };
  const grew = windows.at(-1)!.requests / windows[0].requests - 1;
  const p95 = windows.map((w) => w.p95);
  return { title: `Requests ${grew < 0 ? 'fell' : 'grew'} ${formatPercent(Math.abs(grew), 1)} in a year, and p95 stayed between ${Math.round(Math.min(...p95))} and ${Math.round(Math.max(...p95))} ms`, windows };
}

/**
 * The requests a day over Monday to Friday of each week whose five weekdays are all kept, oldest first, with the
 * Friday each ends on. A week the records begin or end inside, short of a weekday, is not one.
 */
function weekdayAverages(history: readonly DailyPoint[]): { value: number; friday: string }[] {
  const weeks = new Map<string, DailyPoint[]>();
  for (const d of history) {
    const at = new Date(`${d.date}T00:00:00Z`);
    const wd = at.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const monday = new Date(at.getTime() - (wd - 1) * 86_400_000).toISOString().slice(0, 10);
    weeks.set(monday, [...(weeks.get(monday) ?? []), d]);
  }
  return [...weeks.values()].filter((w) => w.length === 5).map((w) => ({ value: sum(w.map((d) => d.requests)) / 5, friday: w[4].date }));
}

/**
 * The facts of a year, each from a rule of `src/lib/facts.ts` over every complete day kept, in this order, at most
 * five: the requests answered with the share answered without an error; what customers were billed; the busiest day
 * yet (a record over the days up to it); the first day requests passed a threshold; and the weekday average, only
 * when the latest week's is the highest yet. A fact whose rule does not hold is not stated.
 */
function yearFacts(history: readonly DailyPoint[]): Fact[] {
  if (!history.length) return [];
  const requests = history.map((d) => ({ date: d.date, value: d.requests }));
  const busiest = requests.reduce((m, d, i) => (d.value > requests[m].value ? i : m), 0);
  const weeks = weekdayAverages(history);
  // Each line names its own date, so the context carries it without an address beside it; the page draws the day too.
  const at = (fact: Fact | null) => (fact ? handed(fact) : null);
  return [
    at(total(requests, { what: 'requests answered', format: count, share: { part: history.map((d) => d.requests - d.errors), what: 'of them without an error' } })),
    at(total(history.map((d) => ({ date: d.date, value: d.revenue })), { what: 'billed to customers', format: (n) => formatCost(cents(n)) })),
    at(record(requests.slice(0, busiest + 1).map((d) => d.value), { needs: rules.recordNeedsPeriods, what: 'day of requests', format: count, day: requests[busiest].date })),
    at(first(requests, { thresholds: rules.firsts.requestsADay, what: 'Requests', format: formatCompact })),
    weeks.length ? at(record(weeks.map((w) => w.value), { needs: rules.recordNeedsPeriods, what: 'weekday average', format: (n) => `${count(Math.round(n))} requests a day`, day: weeks.at(-1)!.friday, week: true })) : null,
  ].filter((f): f is Fact => f !== null).slice(0, YEAR_FACTS);
}

/**
 * What Home states at its head, worked out on the server: its title for the period, the facts of a year, and the
 * revenue's record line the revenue card states as its finding. `history` is every complete day kept, oldest first
 * and ending yesterday, or null when it could not be read. A record compares the period with each earlier whole window
 * of its length, so 90 days and All, which have fewer windows than a record needs, state the change or the figure alone.
 */
export function homeHead({ period, totals, history, services }: { period: Period; totals: HomeData['totals']; history: readonly DailyPoint[] | null; services: readonly ServiceNow[] | null }): PageHead & { record: string | null } {
  if (!history) return { title: null, facts: [], unknown: HISTORY_UNREAD, record: null };
  if (!history.length) return { title: null, facts: [], record: null };
  // The days the period covers: its length, or every day kept where fewer are, as with All.
  const days = Math.min(PERIOD_DAYS[period] ?? history.length, history.length);
  const latest = record(periods(history.map((d) => d.revenue), days), { needs: rules.recordNeedsPeriods, what: `${inDays(days)} of revenue`, format: formatCost });
  return {
    title: homeTitle({ days, revenue: totals.current.revenue, previous: totals.previous?.revenue ?? null, record: latest, services }),
    facts: yearFacts(history),
    record: latest?.text ?? null,
  };
}

/** What Home's read could read, each null when its read failed; `costs` is undefined for a person who may not read it. */
export type HomeReads = {
  period: Period;
  day: string | null;
  days: { series: DailyPoint[]; previous: DailyPoint[]; totals: { current: Totals; previous: Totals | null }; running: DailyPoint | null } | null;
  history: DailyPoint[] | null;
  customers: CustomerRecord[] | null;
  usage: UsageRow[] | null;
  models: Model[] | null;
  compute: ComputeRow[] | null;
  costs?: CostRow[] | null;
  services: ServiceNow[] | null;
  /** Every incident, newest first. */
  incidents: Incident[] | null;
  releases: ReleaseRow[] | null;
  tickets: Pick<Ticket, 'state'>[] | null;
  endpoints: Endpoint[];
  mix: { label: string; value: number }[];
  activity: ActivityEvent[];
  summary: MainSummary;
  updatedAt: string;
  now: string;
};

/** A figure over the period's dates and over the dates before them: the sum of `value` of the rows whose date is in each, and one point a period day. */
function overDays<R extends { date: string }>(rows: readonly R[], dates: readonly string[], before: readonly string[], value: (rows: R[]) => number): { now: number; before: number | null; points: number[] } {
  const byDate = new Map<string, R[]>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  const of = (ds: readonly string[]) => ds.flatMap((d) => byDate.get(d) ?? []);
  return { now: value(of(dates)), before: before.length ? value(of(before)) : null, points: dates.map((d) => value(byDate.get(d) ?? [])) };
}

/** GPU-hours used over GPU-hours provisioned; zero when nothing was provisioned. */
const inUse = (rows: readonly ComputeRow[]) => {
  const offered = sum(rows.map((r) => r.gpus * 24));
  return offered ? sum(rows.map((r) => r.used)) / offered : 0;
};

/** The lines worth knowing across the company, in their order, at most four, each with the address where it is handled. */
function worthKnowing({ incidents, customers, releases, now }: { incidents: Incident[] | null; customers: CustomerRecord[] | null; releases: ReleaseRow[] | null; now: string }): WorthKnowing[] {
  const lines: WorthKnowing[] = [];
  const open = (incidents ?? []).filter((i) => i.state !== 'resolved');
  if (open.length) {
    const i = open[0];
    const more = open.length - 1;
    // The service is named once: in the title when it names it, after it otherwise.
    const named = i.title.includes(i.service) ? i.title : `${i.title} on ${i.service}`;
    lines.push({ text: `${named}: ${i.state}, open for ${formatDuration(Date.parse(now) - Date.parse(i.started))}${i.owner ? `, with ${i.owner}` : ''}${more ? `; ${more} more ${plural(more, 'incident is', 'incidents are')} open` : ''}`, href: '/engineering' });
  }
  const counted = kept(customers ?? []);
  const { revenue } = customerFigures(counted);
  // The share that counts is the configuration's, read now: a product that changes it changes what is worth knowing.
  const at = rules.concentrationAt;
  const over = revenue ? [...counted].sort((a, b) => b.revenue - a.revenue).filter((c) => c.revenue / revenue >= at) : [];
  if (over.length) {
    const others = over.length - 1;
    lines.push({ text: `${over[0].name} pays ${formatPercent(over[0].revenue / revenue, 1)} of the revenue of the last 30 days${others ? `, and ${others} other ${plural(others, 'customer pays', 'customers pay')} ${share(at)} or more` : ''}`, href: `/customers/${over[0].id}` });
  }
  const ready = (releases ?? []).filter((r) => stageOf(r) === 'ready').sort((a, b) => (releaseMoment(a) < releaseMoment(b) ? 1 : -1));
  if (ready.length) {
    const named = `${ready[0].service} ${ready[0].version}`;
    lines.push({ text: ready.length === 1 ? `${named} passed every required check and has not gone out` : `${ready.length} releases have passed every required check and not gone out, the newest ${named}`, href: releasesAddress({ q: '', state: 'ready', environment: 'all' }) });
  }
  const { pastDue } = customerFigures(counted);
  if (pastDue.length) {
    lines.push({ text: `${pastDue.length} ${plural(pastDue.length, 'customer is', 'customers are')} past due, billed ${formatCost(cents(sum(pastDue.map((c) => c.revenue))))} in the last 30 days`, href: customersAddress({ q: '', plan: 'all', status: 'past due', sort: 'revenue', dir: 'desc', page: '1' }) });
  }
  // Nothing to say is said once, and only when everything it would come from was read.
  if (!lines.length && incidents && customers && releases) return [{ text: `No incident is open, no customer pays ${share(at)} or more of revenue, no release waits to go out and no customer is past due` }];
  return lines.slice(0, WORTH_LINES);
}

/** The totals of no days: what a period with no day read hands today's body. */
const NO_TOTALS: Totals = { requests: 0, errorRate: 0, p95: 0, revenue: 0 };

/** Home's data from what its read could read. */
export function homeData(r: HomeReads): HomeData {
  const unread: string[] = [];
  const read = <T>(value: T | null, name: string): value is T => {
    if (value === null) unread.push(name);
    return value !== null;
  };
  const series = r.days?.series ?? [];
  const totals = r.days?.totals ?? { current: NO_TOTALS, previous: null };
  const { current: c, previous: p } = totals;
  const dates = series.map((d) => d.date);
  const before = (r.days?.previous ?? []).map((d) => d.date);
  const head = homeHead({ period: r.period, totals, history: r.history, services: r.services });
  const days = read(r.days, 'the days');

  const counted = read(r.customers, 'the customers') ? kept(r.customers) : null;
  const every = counted ? allSentMore(counted) : null;
  const customers = counted && {
    count: counted.length,
    active: counted.filter((x) => x.status === 'active').length,
    trial: counted.filter((x) => x.status === 'trial').length,
    pastDue: counted.filter((x) => x.status === 'past due').length,
    finding: every?.text ?? null,
  };

  let sold: HomeData['sold'] = null;
  if (read(r.usage, 'the usage by model') && read(r.models, 'the models')) {
    const usage = r.usage, inPeriod = new Set(dates);
    const of = (model: string) => cents(sum(usage.filter((u) => u.model === model && inPeriod.has(u.date)).map((u) => u.revenue)));
    // The largest first, the order a Composition bar takes its slots in.
    const byModel = r.models.map((m) => ({ key: m.id, label: m.label, value: of(m.id) })).sort((a, b) => b.value - a.value);
    const whole = sum(byModel.map((m) => m.value));
    sold = byModel.map((m) => ({ ...m, share: whole ? m.value / whole : 0 }));
  }

  let compute: HomeData['compute'] = null;
  if (read(r.compute, 'the compute')) {
    const held = overDays(r.compute, dates, before, inUse);
    const inPeriod = new Set(dates);
    const rows = r.compute.filter((x) => inPeriod.has(x.date));
    const regions = [...new Set(rows.map((x) => x.region))].map((region) => ({ region, value: inUse(rows.filter((x) => x.region === region)) }));
    compute = {
      value: held.now, previous: held.before, points: held.points,
      used: Math.round(sum(rows.map((x) => x.used))), provisioned: sum(rows.map((x) => x.gpus * 24)),
      fullest: regions.length ? regions.reduce((m, x) => (x.value > m.value ? x : m)) : null,
    };
  }

  // What compute cost, and gross margin with it, only for a person who may read it: for anyone else neither key exists.
  const money: Pick<HomeData, 'computeCost' | 'grossMargin'> = {};
  if (r.costs !== undefined) {
    if (read(r.costs, 'the compute cost')) {
      const cost = overDays(r.costs, dates, before, (rows) => cents(sum(rows.map((x) => x.compute))));
      const computeCost: HomeFigure = { value: cost.now, previous: cost.before, points: cost.points };
      const margin = (revenue: number, cost: number) => (revenue ? (revenue - cost) / revenue : 0);
      money.computeCost = computeCost;
      money.grossMargin = days && c.revenue ? { value: margin(c.revenue, cost.now), previous: p && cost.before !== null ? margin(p.revenue, cost.before) : null, points: series.map((d, i) => margin(d.revenue, cost.points[i])) } : null;
    } else {
      money.computeCost = null;
      money.grossMargin = null;
    }
  }

  const services = read(r.services, 'the services') ? { operational: r.services.filter((s) => s.status === 'operational').length, of: r.services.length, unwell: unwellNames(r.services) } : null;
  const incidents = read(r.incidents, 'the incidents') ? r.incidents : null;
  const releases = read(r.releases, 'the releases') ? r.releases : null;
  const tickets = read(r.tickets, 'the tickets') ? r.tickets : null;
  const dash = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(n));
  const best = series.length ? series.reduce((m, d) => (d.revenue > m.revenue ? d : m)) : null;
  const band = days ? steady(series, rules.band) : null;

  return {
    period: r.period,
    series,
    totals,
    running: r.days?.running ?? null,
    head: { title: head.title, facts: head.facts, ...(head.unknown ? { unknown: head.unknown } : {}) },
    line: homeLine({ days: series.length, customers: customers?.count ?? null, requests: days ? c.requests : null, previous: p?.requests ?? null, ...(r.costs !== undefined ? { margin: money.grossMargin?.value ?? null } : {}), services: r.services }),
    revenue: days ? { value: c.revenue, previous: p?.revenue ?? null, points: series.map((d) => d.revenue), average: series.length ? cents(c.revenue / series.length) : 0, best: best && { date: best.date, value: best.revenue }, finding: head.record, running: r.days?.running?.revenue ?? null } : null,
    customers,
    tokens: days ? { value: sum(series.map((d) => d.tokens)), requests: c.requests } : null,
    requests: days ? { value: c.requests, previous: p?.requests ?? null, points: series.map((d) => d.requests) } : null,
    band: band && { inside: band.inside, of: band.of, text: band.text },
    compute,
    ...money,
    year: r.history ? yearOf(r.history, r.period) : null,
    sold,
    services,
    business: {
      lines: [
        { label: 'Revenue', value: days ? formatCost(c.revenue) : '—' },
        { label: 'Customers', value: dash(customers?.count) },
        { label: 'On a trial', value: dash(customers?.trial) },
        { label: 'Past due', value: dash(customers?.pastDue) },
      ],
      fact: counted?.length ? every?.text ?? `${counted.filter((x) => sentMore(x.trend)).length} of ${counted.length} customers sent more requests this week than last` : null,
      href: '/business',
    },
    engineering: {
      lines: [
        { label: SERVICES_OPERATIONAL, value: services ? `${services.operational} of ${services.of}` : '—' },
        { label: INCIDENTS_OPEN, value: dash(incidents?.filter((i) => i.state !== 'resolved').length) },
        { label: 'Releases in testing', value: dash(releases && releaseFigures(releases).testing) },
        { label: 'Tickets open', value: dash(tickets && ticketCounts(tickets).open) },
      ],
      fact: r.history ? steady(r.history, rules.band)?.text ?? null : null,
      href: '/engineering',
    },
    worth: worthKnowing({ incidents, customers: r.customers, releases, now: r.now }),
    unread,
    endpoints: r.endpoints,
    mix: r.mix,
    activity: r.activity,
    summary: r.summary,
    updatedAt: r.updatedAt,
    now: r.now,
    day: r.day,
  };
}

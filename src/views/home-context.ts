/**
 * The Home's shared context (decision 0011): what the console page, the MCP view and the console's assistant are
 * all told about traffic, reliability and revenue. The tiles' definitions live here too, so the person's info button and
 * the agents read the same words.
 */
import { facts as rules } from '@/app.config';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { DailyPoint, Totals } from '@/data/sample';
import { CUSTOMER_METRICS } from './customers-context';
import type { MainSummary } from './main-summary';
import { RELEASE_METRICS } from './releases-context';
import { TEST_METRICS } from './tests-context';
import { TICKET_METRICS } from './tickets-context';
import { periods, record, total } from '@/lib/facts';
import { formatCompact, formatCost, formatDuration, formatPercent, ordinal, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { deviations, largest, runs, sameWeekdayBaseline, weekday, weekendRatio, median } from '@/lib/insight';
import { PERIOD_DAYS, PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { HISTORY_UNREAD, STATE, against, handed, headInsights, inDays, worst, type PageHead, type ServiceNow } from './fact-insight';

/** Each Home figure: its label and what it counts. The tile's info button shows `hint`; the agents read it too. */
export const HOME_METRICS = {
  requests: { label: 'Requests', hint: 'Every call the gateway answered, at any status.' },
  errorRate: { label: 'Error rate', hint: 'Share of requests answered with a 5xx or a 429.' },
  p95: { label: 'Latency p95', hint: '95 of every 100 requests finished faster.' },
  revenue: { label: 'Revenue', hint: 'What customers were billed for metered usage, before credits.' },
} as const;

/** A period's days as the rows of a file: one flat row a day, with the day's revenue by plan in a column each. */
export const dayRows = (series: DailyPoint[]) => series.map(({ revenueByPlan, ...d }) => ({ ...d, revenueEnterprise: revenueByPlan.Enterprise, revenueScale: revenueByPlan.Scale, revenueStarter: revenueByPlan.Starter }));

export type HomeData = {
  period: Period;
  /** The period's complete days, oldest first and ending yesterday. */
  series: DailyPoint[];
  /** The period's totals and those of the same number of days before it; `previous` is null when no day before is kept, as with `all`. */
  totals: { current: Totals; previous: Totals | null };
  /** The day in progress, counted in none of the above; null when the latest day kept is complete. */
  running: DailyPoint | null;
  endpoints: { method: string; route: string; requests: number; errorRate: number }[];
  mix: { label: string; value: number }[];
  activity: ActivityEvent[];
  /** Live and past incidents: what might explain a day that stands out. */
  incidents: Incident[];
  /** Main's three summaries of the whole product; one that could not be read is null. */
  summary: MainSummary;
  /** The page's title and the total it states, worked out on the server from every complete day kept (`homeHead`). */
  head: PageHead;
  /** The one sentence under the title when a service is not operational (`servicesLine`); null when every one is, or they could not be read. */
  unwell: string | null;
  updatedAt: string;
  now: string;
  /** The day the address names (`?day=`): the page opens pointed at it. */
  day?: string | null;
};

const DAY = 86_400_000;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const day = (iso: string) => formatDate(iso).replace(/ \d{4}$/, '');
const times = (r: number) => `${r.toFixed(1)}×`;
/** "21 Sept", "21 and 22 Sept", "21, 22 and 23 Sept" (the month repeats when it changes). */
function days(dates: string[]): string {
  const names = dates.map(day);
  const month = names[0].split(' ')[1];
  // One month named once: "21 and 22 Sept"; across a month end each day keeps its own.
  const short = names.every((n) => n.split(' ')[1] === month) ? names.map((n, i) => (i < names.length - 1 ? n.split(' ')[0] : n)) : names;
  return short.length === 1 ? short[0] : `${short.slice(0, -1).join(', ')} and ${short.at(-1)}`;
}

/**
 * The Home's title, from plain figures. A record is stated alone, with its run. Otherwise the revenue's change on the
 * period before, or the revenue alone when no period comes before, and then what the services are doing now: a title
 * says what is wrong today in the same sentence. `services` is null when they could not be read, and the clause is left out.
 */
export function homeTitle({ days, revenue, previous, record: latest, services }: { days: number; revenue: number; previous: number | null; record: { run: number } | null; services: readonly ServiceNow[] | null }): string {
  const period = inDays(days);
  if (latest) return `The highest ${period} yet: ${formatCost(revenue)}${latest.run > 1 ? `, the ${ordinal(latest.run)} record in a row` : ''}`;
  const moved = against(revenue, previous);
  const said = !moved ? `${formatCost(revenue)} of revenue in ${period}` : moved.way === 'level' ? `Revenue is level with the ${period} before` : `Revenue is ${moved.way} ${moved.by} on the ${period} before`;
  if (!services) return said;
  const unwell = worst(services);
  if (!unwell) return `${said}, and every service is operational`;
  return `${said}, and ${unwell.names.length === 1 ? `${unwell.names[0]} is` : `${unwell.names.length} services are`} ${STATE[unwell.state]}`;
}

/**
 * The one sentence under the Home's title when a service is not operational: which are down and which degraded, by
 * name. A record's title has no clause about the services, so what is wrong today is said here. Null when every
 * service is operational or the services could not be read.
 */
export function servicesLine(services: readonly ServiceNow[] | null): string | null {
  const named = (state: keyof typeof STATE) => {
    const names = (services ?? []).filter((s) => s.status === state).map((s) => s.name);
    if (!names.length) return null;
    const list = names.length > 3 ? `${names.length} services` : names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    return `${list} ${plural(names.length, 'is', 'are')} ${STATE[state]}`;
  };
  const said = [named('outage'), named('degraded')].filter(Boolean);
  return said.length ? `${said.join(', and ')}.` : null;
}

/**
 * What the Home states at its head, worked out on the server: its title for the period and the total of requests over
 * every complete day kept. `history` is those days, oldest first and ending yesterday, or null when they could not be
 * read. A record compares the period with each earlier whole window of its length, so 90 days and All, which have fewer
 * windows than a record needs, state the change or the figure alone.
 */
export function homeHead({ period, totals, history, services }: { period: Period; totals: HomeData['totals']; history: readonly DailyPoint[] | null; services: readonly ServiceNow[] | null }): PageHead {
  if (!history) return { title: null, facts: [], unknown: HISTORY_UNREAD };
  if (!history.length) return { title: null, facts: [] };
  // The days the period covers: its length, or every day kept where fewer are, as with All.
  const days = Math.min(PERIOD_DAYS[period] ?? history.length, history.length);
  const latest = record(periods(history.map((d) => d.revenue), days), { needs: rules.recordNeedsPeriods, what: `${inDays(days)} of revenue`, format: formatCost });
  const answered = total(history.map((d) => ({ date: d.date, value: d.requests })), { what: 'requests answered', format: (n) => n.toLocaleString('en-US') });
  return {
    title: homeTitle({ days, revenue: totals.current.revenue, previous: totals.previous?.revenue ?? null, record: latest, services }),
    facts: answered ? [handed(answered, '/?period=all')] : [],
  };
}

/** What a context says when no day is kept before the period: `all`, or a product's first days. */
export const NO_PREVIOUS = 'No previous period is kept, so no figure has a change.';

/**
 * "up 12.4% vs the previous 30 days (0.80%)": the relative change, its direction, and the figure it is against. Nothing
 * when there is no period before, or when its figure was zero.
 */
export function change(now: number, before: number | undefined, period: Period, format: (n: number) => string): string | undefined {
  const n = PERIOD_DAYS[period];
  if (!n || !before) return undefined;
  const r = now / before - 1;
  const dir = Math.abs(r) < 0.0005 ? 'unchanged' : r > 0 ? 'up' : 'down';
  return `${dir}${dir === 'unchanged' ? '' : ` ${formatPercent(Math.abs(r), 1)}`} vs the previous ${n} days (${format(before)})`;
}

/** Whether anything recorded (an activity event or an incident) falls within a day of `from`..`to`, and what. */
function recorded(from: string, to: string, data: Pick<HomeData, 'incidents' | 'activity'>): string[] {
  const a = Date.parse(from) - DAY, b = Date.parse(to) + 2 * DAY;
  const inside = (iso?: string) => !!iso && Date.parse(iso) >= a && Date.parse(iso) < b;
  return [
    ...[...new Map(data.incidents.map((i) => [i.id, i])).values()].filter((i) => inside(i.started)).map((i) => `the incident "${i.title}" (${i.state}, started ${formatDate(i.started)})`),
    ...data.activity.filter((e) => inside(e.at)).map((e) => `${e.actor} ${e.verb} ${e.object} (${formatDate(e.at)})`),
  ];
}

/**
 * The days whose error rate stands far above the period's own steady state, in runs of consecutive days, with latency
 * when it rose with them, and what was recorded beside them (an incident, an activity event) or that nothing was.
 * The Home and Usage both read the same run of days.
 */
export function errorSpikes(data: Pick<HomeData, 'series' | 'incidents' | 'activity' | 'period'>): { insights: Insight[]; unknowns: string[] } {
  const { series } = data;
  const dates = series.map((d) => d.date);
  const errorRate = series.map((d) => (d.requests ? d.errors / d.requests : 0));
  const p95 = series.map((d) => d.p95);
  const pct = (n: number) => formatPercent(n, 2);
  const insights: Insight[] = [];
  const unknowns: string[] = [];
  // Days whose error rate stands far above the period's own steady state, in runs of consecutive days.
  const errMedian = median(errorRate);
  const errDev = deviations(errorRate, { direction: 'up' });
  const flagged = new Set(errDev.map((d) => d.index));
  const quietMax = Math.max(...errorRate.filter((_, i) => !flagged.has(i)).map((v) => v / errMedian));
  for (const run of runs([...flagged]).slice(-3)) {
    const ratios = run.map((i) => errorRate[i] / errMedian);
    const lo = Math.min(...ratios), hi = Math.max(...ratios);
    const when = days(run.map((i) => dates[i]));
    insights.push({ text: `Error rate was ${lo === hi ? times(hi) : `${times(lo)} to ${times(hi)}`} the period's median of ${pct(errMedian)} on ${when} (${run.map((i) => pct(errorRate[i])).join(', ')}); no other day passed ${times(quietMax)}.`, evidence: `/?period=${data.period}&day=${dates[run.reduce((m, i) => (errorRate[i] > errorRate[m] ? i : m))]}` });
    const p95Run = run.filter((i) => p95[i] / median(p95) >= 1.4);
    if (p95Run.length) insights.push({ text: `Latency p95 rose on the same ${p95Run.length === 1 ? 'day' : 'days'}: ${p95Run.map((i) => formatDuration(p95[i])).join(' and ')} against a median of ${formatDuration(median(p95))}.` });
    const found = recorded(dates[run[0]], dates[run.at(-1)!], data);
    if (found.length) insights.push({ text: `Recorded around ${when}: ${found.join('; ')}.`, evidence: '/services' });
    else unknowns.push(`Nothing is recorded between ${day(new Date(Date.parse(dates[run[0]]) - DAY).toISOString())} and ${day(new Date(Date.parse(dates[run.at(-1)!]) + DAY).toISOString())}: no incident and no activity event, so the rise is unexplained.`);
  }

  return { insights, unknowns };
}

/**
 * What the person sees of the same findings (decision 0011): each daily figure's usual value (its median, for "2.7×
 * usual" when the Meridian points at a day) and the error rate's latest spike as one short line that points at its peak.
 * A spike needs a look, so its tone is the warning one.
 */
export function homeFindings(series: DailyPoint[]): { usual: { errorRate: number; p95: number }; errorSpike?: { text: string; day: string; tone: 'warning' } } {
  const errorRate = series.map((d) => (d.requests ? d.errors / d.requests : 0));
  const usual = { errorRate: median(errorRate), p95: median(series.map((d) => d.p95)) };
  const run = runs(deviations(errorRate, { direction: 'up' }).map((d) => d.index)).at(-1);
  if (!run || !(usual.errorRate > 0)) return { usual };
  const peak = run.reduce((m, i) => (errorRate[i] > errorRate[m] ? i : m));
  return { usual, errorSpike: { text: `${times(errorRate[peak] / usual.errorRate)} usual on ${days(run.map((i) => series[i].date))}`, day: series[peak].date, tone: 'warning' } };
}

/**
 * What Main says of the whole product, as the assistant reads it: the same figures the three regions draw, under the
 * labels their own pages use, and a plain unknown for a summary that could not be read.
 */
function summaryContext({ business, operation, delivery }: MainSummary): { facts: Fact[]; insights: Insight[]; unknowns: string[] } {
  const facts: Fact[] = [];
  const insights: Insight[] = [];
  const unknowns: string[] = [];
  if (business) {
    const counts = (by: Record<string, number>) => Object.entries(by).map(([k, n]) => `${n} ${k}`).join(', ');
    facts.push(
      { label: CUSTOMER_METRICS.customers.label, value: String(business.customers) },
      // Under the labels the region itself uses, each beside the count of customers it divides.
      { label: 'By status', value: counts(business.byStatus) },
      { label: 'By plan', value: counts(business.byPlan) },
      { label: CUSTOMER_METRICS.revenue.label, value: formatCost(business.revenue) },
    );
  } else unknowns.push('The business summary could not be read, so the customer figures are missing, not zero.');
  if (operation) {
    const said = [
      operation.outage.length && `Out: ${operation.outage.join(', ')}.`,
      operation.degraded.length && `Degraded: ${operation.degraded.join(', ')}.`,
      operation.incidents.length && `Open incidents: ${operation.incidents.map((i) => `"${i.title}"`).join(', ')}.`,
    ].filter(Boolean);
    insights.push({ text: said.length ? said.join(' ') : 'Every service is operational and no incident is open.' });
  } else unknowns.push('The operation summary could not be read, so the services and incidents are missing, not healthy.');
  if (delivery) {
    facts.push(
      { label: TICKET_METRICS.open.label, value: String(delivery.open) },
      { label: TICKET_METRICS.waiting.label, value: String(delivery.waiting) },
      { label: TEST_METRICS.failing.label, value: String(delivery.failing) },
      { label: RELEASE_METRICS.live.label, value: String(delivery.live) },
      { label: RELEASE_METRICS.ready.label, value: String(delivery.ready) },
      { label: RELEASE_METRICS.testing.label, value: String(delivery.testing) },
    );
  } else unknowns.push('The delivery summary could not be read, so the tickets, verifications and releases are missing, not zero.');
  return { facts, insights, unknowns };
}

/** The Home's context for `data`, with the person pointing at day `index` of the series, or at nothing. */
export function homeContext(data: HomeData, index: number | null = null): SharedContext {
  const { period, series, totals } = data;
  const { current: c, previous: p } = totals;
  const address = `/?period=${period}${index !== null && series[index] ? `&day=${series[index].date}` : ''}`;
  const label = PERIOD_LABEL[period].toLowerCase();
  const scope = series.length ? `${label}, ${formatDate(series[0].date)} to ${formatDate(series.at(-1)!.date)} (UTC days)` : label;
  const pct = (n: number) => formatPercent(n, 2);
  const M = HOME_METRICS;

  const facts: Fact[] = [
    { label: M.requests.label, value: c.requests.toLocaleString('en-US'), change: change(c.requests, p?.requests, period, (n) => n.toLocaleString('en-US')), definition: M.requests.hint },
    { label: M.errorRate.label, value: pct(c.errorRate), change: change(c.errorRate, p?.errorRate, period, pct), definition: M.errorRate.hint },
    { label: M.p95.label, value: formatDuration(c.p95), change: change(c.p95, p?.p95, period, formatDuration), definition: M.p95.hint },
    { label: M.revenue.label, value: formatCost(c.revenue), change: change(c.revenue, p?.revenue, period, formatCost), definition: M.revenue.hint },
  ];
  const main = summaryContext(data.summary);
  facts.push(...main.facts);
  const stated = data.head.unknown ? [data.head.unknown] : [];
  if (!series.length) return { view: 'home', title: 'Home', address, scope, freshness: freshnessOf(data.updatedAt, data.now), facts, insights: [...headInsights(data.head), ...main.insights], unknowns: ['No requests have arrived in this period, so there is nothing to compare.', ...main.unknowns, ...stated] };

  const dates = series.map((d) => d.date);
  const errorRate = series.map((d) => (d.requests ? d.errors / d.requests : 0));
  const p95 = series.map((d) => d.p95);
  const requests = series.map((d) => d.requests);
  // The title first, as the page is headed, then the total: what the page states before what code found in the period.
  const insights: Insight[] = headInsights(data.head);
  const unknowns: string[] = [...main.unknowns, ...stated];
  const errMedian = median(errorRate);

  const spikes = errorSpikes(data);
  insights.push(...spikes.insights);
  unknowns.push(...spikes.unknowns);

  // Where the errors come from: the endpoint that contributes most, against its share of traffic.
  const top = largest(data.endpoints, (e) => e.requests * e.errorRate);
  if (top) {
    const trafficShare = top.item.requests / data.endpoints.reduce((s, e) => s + e.requests, 0);
    insights.push({ text: `${top.item.method} ${top.item.route} accounts for ${formatPercent(top.share, 0)} of the errors on ${formatPercent(trafficShare, 0)} of its requests (its error rate ${pct(top.item.errorRate)}).`, evidence: '/usage' });
  }
  const worst = data.endpoints.reduce((m, e) => (e.errorRate > m.errorRate ? e : m), data.endpoints[0]);
  if (worst && worst !== top?.item && worst.errorRate >= 2 * c.errorRate) {
    insights.push({ text: `${worst.method} ${worst.route} has the highest error rate, ${pct(worst.errorRate)}, ${times(worst.errorRate / c.errorRate)} the overall rate, on ${formatCompact(worst.requests)} requests.`, evidence: '/usage' });
  }

  // The weekly shape: a weekend is not a drop.
  const weekly = weekendRatio(requests, dates);
  if (weekly !== null && weekly < 0.8) insights.push({ text: `A weekend day runs at about ${formatPercent(weekly, 0)} of a weekday: compare same weekdays.` });

  // What the status classes mean against the error rate's definition.
  const answered = data.mix.reduce((s, m) => s + m.value, 0);
  const share = (label: string) => (data.mix.find((m) => m.label === label)?.value ?? 0) / (answered || 1);
  if (answered) insights.push({ text: `Responses: 4xx ${formatPercent(share('4xx'), 1)}, 5xx ${formatPercent(share('5xx'), 1)}. Most 4xx are client mistakes, not in the error rate.` });

  if (!p) unknowns.push(NO_PREVIOUS);
  // The day in progress is in no figure above: the period ends yesterday. One short line, for the context's budget.
  if (data.running) unknowns.push(`${day(data.running.date)} is in progress and counted in no total.`);

  let focus: string | undefined;
  if (index !== null && series[index]) {
    const d = series[index];
    const usual = sameWeekdayBaseline(requests, dates, index);
    const wd = WEEKDAY[weekday(d.date)];
    focus = `${formatDate(d.date)}, a ${wd}: ${d.requests.toLocaleString('en-US')} requests${usual ? ` (${times(d.requests / usual)} the median ${wd})` : ''}; error rate ${pct(errorRate[index])} (${times(errorRate[index] / errMedian)} the period's median); latency p95 ${formatDuration(d.p95)} (${times(d.p95 / median(p95))} the median); revenue ${formatCost(d.revenue)}.`;
  }

  insights.push(...main.insights);

  return { view: 'home', title: 'Home', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}

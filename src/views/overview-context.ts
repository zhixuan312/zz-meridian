/**
 * The Overview's shared context (decision 0011): what the console page, the MCP view and the console's assistant are
 * all told about traffic, reliability and spend. The tiles' definitions live here too, so the person's info button and
 * the agents read the same words.
 */
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { DailyPoint, Totals } from '@/data/sample';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { deviations, largest, runs, sameWeekdayBaseline, weekday, weekendRatio, median } from '@/lib/insight';
import { PERIOD_DAYS, PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

/** Each Overview figure: its label and what it counts. The tile's info button shows `hint`; the agents read it too. */
export const OVERVIEW_METRICS = {
  requests: { label: 'Requests', hint: 'Every call the gateway answered, whatever its status.' },
  errorRate: { label: 'Error rate', hint: 'Share of requests answered with a 5xx or a 429.' },
  p95: { label: 'Latency p95', hint: '95 of every 100 requests finished faster than this.' },
  spend: { label: 'Spend', hint: 'Metered usage in US dollars, before credits.' },
} as const;

export type OverviewData = {
  period: Period;
  series: DailyPoint[];
  totals: { current: Totals; previous: Totals };
  endpoints: { method: string; route: string; requests: number; errorRate: number }[];
  mix: { label: string; value: number }[];
  activity: ActivityEvent[];
  /** Live and past incidents: what might explain a day that stands out. */
  incidents: Incident[];
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

/** "up 12.4% vs the previous 30 days (0.80%)": the relative change, its direction, and the figure it is against. */
function change(now: number, before: number, period: Period, format: (n: number) => string): string | undefined {
  const n = PERIOD_DAYS[period];
  if (!n || !before) return undefined;
  const r = now / before - 1;
  const dir = Math.abs(r) < 0.0005 ? 'unchanged' : r > 0 ? 'up' : 'down';
  return `${dir}${dir === 'unchanged' ? '' : ` ${formatPercent(Math.abs(r), 1)}`} vs the previous ${n} days (${format(before)})`;
}

/** Whether anything recorded (an activity event or an incident) falls within a day of `from`..`to`, and what. */
function recorded(from: string, to: string, data: Pick<OverviewData, 'incidents' | 'activity'>): string[] {
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
 * The Overview and Analytics both read the same run of days.
 */
export function errorSpikes(data: Pick<OverviewData, 'series' | 'incidents' | 'activity' | 'period'>): { insights: Insight[]; unknowns: string[] } {
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
    if (found.length) insights.push({ text: `Recorded around ${when}: ${found.join('; ')}.`, evidence: '/health' });
    else unknowns.push(`Nothing is recorded between ${day(new Date(Date.parse(dates[run[0]]) - DAY).toISOString())} and ${day(new Date(Date.parse(dates[run.at(-1)!]) + DAY).toISOString())}: no incident and no activity event, so nothing on this page explains the rise on ${when}.`);
  }

  return { insights, unknowns };
}

/** The Overview's context for `data`, with the person pointing at day `index` of the series, or at nothing. */
export function overviewContext(data: OverviewData, index: number | null = null): SharedContext {
  const { period, series, totals } = data;
  const { current: c, previous: p } = totals;
  const address = `/?period=${period}${index !== null && series[index] ? `&day=${series[index].date}` : ''}`;
  const label = PERIOD_LABEL[period].toLowerCase();
  const scope = series.length ? `${label}, ${formatDate(series[0].date)} to ${formatDate(series.at(-1)!.date)} (UTC days)` : label;
  const pct = (n: number) => formatPercent(n, 2);
  const M = OVERVIEW_METRICS;

  const facts: Fact[] = [
    { label: M.requests.label, value: c.requests.toLocaleString('en-US'), change: change(c.requests, p.requests, period, (n) => n.toLocaleString('en-US')), definition: M.requests.hint },
    { label: M.errorRate.label, value: pct(c.errorRate), change: change(c.errorRate, p.errorRate, period, pct), definition: M.errorRate.hint },
    { label: M.p95.label, value: formatDuration(c.p95), change: change(c.p95, p.p95, period, formatDuration), definition: M.p95.hint },
    { label: M.spend.label, value: formatCost(c.spend), change: change(c.spend, p.spend, period, formatCost), definition: M.spend.hint },
  ];
  if (!series.length) return { view: 'overview', title: 'Overview', address, scope, freshness: freshnessOf(data.updatedAt, data.now), facts, insights: [], unknowns: ['No requests have arrived in this period, so there is nothing to compare.'] };

  const dates = series.map((d) => d.date);
  const errorRate = series.map((d) => (d.requests ? d.errors / d.requests : 0));
  const p95 = series.map((d) => d.p95);
  const requests = series.map((d) => d.requests);
  const insights: Insight[] = [];
  const unknowns: string[] = [];
  const errMedian = median(errorRate);

  const spikes = errorSpikes(data);
  insights.push(...spikes.insights);
  unknowns.push(...spikes.unknowns);

  // Where the errors come from: the endpoint that contributes most, against its share of traffic.
  const top = largest(data.endpoints, (e) => e.requests * e.errorRate);
  if (top) {
    const trafficShare = top.item.requests / data.endpoints.reduce((s, e) => s + e.requests, 0);
    insights.push({ text: `${top.item.method} ${top.item.route} accounts for ${formatPercent(top.share, 0)} of the period's errors on ${formatPercent(trafficShare, 0)} of its requests (its error rate ${pct(top.item.errorRate)}).`, evidence: '/analytics' });
  }
  const worst = data.endpoints.reduce((m, e) => (e.errorRate > m.errorRate ? e : m), data.endpoints[0]);
  if (worst && worst !== top?.item && worst.errorRate >= 2 * c.errorRate) {
    insights.push({ text: `${worst.method} ${worst.route} has the highest error rate, ${pct(worst.errorRate)}, ${times(worst.errorRate / c.errorRate)} the overall rate, on ${formatCompact(worst.requests)} requests.`, evidence: '/analytics' });
  }

  // The weekly shape: a weekend is not a drop.
  const weekly = weekendRatio(requests, dates);
  if (weekly !== null && weekly < 0.8) insights.push({ text: `Requests follow the week: a weekend day runs at about ${formatPercent(weekly, 0)} of a weekday, so compare a day with the same weekday, not with the day before.` });

  // What the status classes mean against the error rate's definition.
  const total = data.mix.reduce((s, m) => s + m.value, 0);
  const share = (label: string) => (data.mix.find((m) => m.label === label)?.value ?? 0) / (total || 1);
  if (total) insights.push({ text: `Responses by class: 4xx ${formatPercent(share('4xx'), 1)}, 5xx ${formatPercent(share('5xx'), 1)}. The error rate counts 5xx and 429 only, so most 4xx (client mistakes) are not in it.` });

  // The last day is partial while the data's clock is still inside it.
  const now = new Date(data.now);
  if (dates.at(-1) === now.toISOString().slice(0, 10)) unknowns.push(`${day(dates.at(-1)!)} is still in progress (${now.getUTCHours()} of 24 hours, UTC), so its figures are partial.`);

  let focus: string | undefined;
  if (index !== null && series[index]) {
    const d = series[index];
    const usual = sameWeekdayBaseline(requests, dates, index);
    const wd = WEEKDAY[weekday(d.date)];
    focus = `${formatDate(d.date)}, a ${wd}: ${d.requests.toLocaleString('en-US')} requests${usual ? ` (${times(d.requests / usual)} the median ${wd})` : ''}; error rate ${pct(errorRate[index])} (${times(errorRate[index] / errMedian)} the period's median); latency p95 ${formatDuration(d.p95)} (${times(d.p95 / median(p95))} the median); spend ${formatCost(d.spend)}.`;
  }

  return { view: 'overview', title: 'Overview', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}

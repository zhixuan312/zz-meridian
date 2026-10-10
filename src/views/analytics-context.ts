/**
 * Analytics' shared context (decision 0011): when traffic comes, where from, what is slow and what fails, as both agents
 * read it. The days that stand out are found by the same code as the Overview's.
 */
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Column } from '@/components/charts/column-chart';
import type { Incident } from '@/components/patterns/incident-card';
import { AccessDenied, can, resolveAccess, type AccessScope } from '@/data/access';
import { REGION_LATENCY, demoHeatmap, requestsByHour, type DailyPoint, type Endpoint } from '@/data/sample';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { median } from '@/lib/insight';
import { PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { errorSpikes } from './overview-context';

export type AnalyticsData = {
  period: Period;
  series: DailyPoint[];
  heat: number[][];
  hours: Column[];
  regions: { label: string; value: number; p50: number }[];
  endpoints: Endpoint[];
  activity: ActivityEvent[];
  incidents: Incident[];
  updatedAt: string;
  now: string;
};

/** The three Analytics figures that are not a collection: the weekday-and-hour heatmap, the hour-of-day columns and the regions with their p50. */
export type AnalyticsFigures = Pick<AnalyticsData, 'heat' | 'hours' | 'regions'>;

/**
 * A scope `analyticsFigures` may be handed: the whole one, or only the part the caller has. `resolveAccess` answers the
 * request's own scope when none is given, and a caller that hands in one is trusted to hold it — the case that matters is
 * a check proving the refusal with a scope the roster does not have — so a field left out is simply absent, and `can`
 * refuses the scope rather than filling anything in.
 */
/**
 * The heatmap, the hours and the regions, read here and nowhere else, so the one thing they share is the grant:
 * `requests:read`, asked on the scope in hand (or the request's own when none is given). A scope that does not hold it
 * gets the single `AccessDenied` message, so a page and a tool cannot draw what the request log would refuse them.
 */
export async function analyticsFigures(scope?: AccessScope): Promise<AnalyticsFigures> {
  const held = scope ?? (await resolveAccess());
  if (!(await can(held, 'requests', 'read'))) throw new AccessDenied();
  return { heat: demoHeatmap(), hours: requestsByHour(), regions: REGION_LATENCY };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const times = (r: number) => `${r.toFixed(1)}×`;

/** Analytics' context; `sort` is how the endpoints table is ordered, `index` the day the Meridian points at. */
export function analyticsContext(data: AnalyticsData, { sort = 'p95 descending', index = null as number | null } = {}): SharedContext {
  const { series, heat, hours, regions, endpoints } = data;
  const address = `/analytics?period=${data.period}`;
  const label = PERIOD_LABEL[data.period].toLowerCase();
  const scope = series.length ? `${label}, ${formatDate(series[0].date)} to ${formatDate(series.at(-1)!.date)} (UTC); the weekday and hour patterns are summed over it` : label;
  if (!series.length || !heat.length || !endpoints.length) return { view: 'analytics', title: 'Analytics', address, scope, freshness: freshnessOf(data.updatedAt, data.now), facts: [], insights: [], unknowns: ['No requests arrived in this period.'] };

  const cells = heat.flatMap((row, d) => row.map((v, h) => ({ v, d, h })));
  const peak = cells.reduce((m, c) => (c.v > m.v ? c : m));
  const peakHour = hours.reduce((m, c) => (c.value > m.value ? c : m));
  const totalRegions = regions.reduce((s, r) => s + r.value, 0);
  const regionMedian = median(regions.map((r) => r.p50));
  const traffic = endpoints.reduce((s, e) => s + e.requests, 0);
  const errors = endpoints.reduce((s, e) => s + e.requests * e.errorRate, 0);
  const overall = errors / traffic;

  const facts: Fact[] = [
    { label: 'Busiest hour of the week', value: `${DAYS[peak.d]} ${String(peak.h).padStart(2, '0')}:00 UTC, ${formatCompact(peak.v)} requests` },
    { label: 'Busiest hour of the day', value: `${peakHour.label} UTC, every weekday summed` },
    { label: 'Requests by region', value: regions.map((r) => `${r.label} ${formatPercent(r.value / totalRegions, 0)} (p50 ${formatDuration(r.p50)})`).join(', '), definition: 'p50 is the median latency: half of the requests finished faster.' },
    { label: 'Endpoints', value: `${endpoints.length}, sorted by ${sort}: ${listed(endpoints, (e) => `${e.method} ${e.route} ${formatCompact(e.requests)} req, ${formatPercent(e.errorRate, 2)} errors, p95 ${formatDuration(e.p95)}`, 'the table has them', 15)}`, definition: 'Error rate: 5xx and 429 responses. p95: 95 of every 100 requests finished faster.' },
  ];

  const insights: Insight[] = [];
  const unknowns: string[] = [];
  const spikes = errorSpikes(data);
  insights.push(...spikes.insights);
  unknowns.push(...spikes.unknowns);
  const slowest = endpoints.reduce((m, e) => (e.p95 > m.p95 ? e : m));
  const p95Median = median(endpoints.map((e) => e.p95));
  insights.push({ text: `${slowest.method} ${slowest.route} is the slowest endpoint: p95 ${formatDuration(slowest.p95)}, ${times(slowest.p95 / p95Median)} the median endpoint's ${formatDuration(p95Median)}, on ${formatPercent(slowest.requests / traffic, 0)} of requests.` });
  const failing = endpoints.reduce((m, e) => (e.errorRate > m.errorRate ? e : m));
  if (failing.errorRate >= 2 * overall) insights.push({ text: `${failing.method} ${failing.route} fails most: ${formatPercent(failing.errorRate, 2)} of its requests, ${times(failing.errorRate / overall)} the ${formatPercent(overall, 2)} across endpoints.`, evidence: `/requests?q=${encodeURIComponent(failing.route)}` });
  const slowRegion = regions.reduce((m, r) => (r.p50 > m.p50 ? r : m));
  if (slowRegion.p50 >= 1.3 * regionMedian) insights.push({ text: `${slowRegion.label} is the slowest region: p50 ${formatDuration(slowRegion.p50)} against a median of ${formatDuration(regionMedian)} across regions, on ${formatPercent(slowRegion.value / totalRegions, 0)} of requests.`, evidence: `/requests?region=${slowRegion.label}` });
  const weekdays = heat.slice(0, 5).flat().reduce((s, v) => s + v, 0) / 5;
  const weekend = heat.slice(5).flat().reduce((s, v) => s + v, 0) / 2;
  if (weekdays) insights.push({ text: `A weekend day carries ${formatPercent(weekend / weekdays, 0)} of a weekday's requests.` });
  unknowns.push('The weekday-and-hour pattern, the regions and the endpoints are summed over the whole period: none of them shows a single day.');

  let focus: string | undefined;
  if (index !== null && series[index]) {
    const d = series[index];
    focus = `${formatDate(d.date)}: ${d.requests.toLocaleString('en-US')} requests and ${d.errors.toLocaleString('en-US')} errors (${formatPercent(d.errors / d.requests, 2)}).`;
  }
  return { view: 'analytics', title: 'Analytics', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}

/**
 * The Home's shared context (decision 0011): what the console page, the MCP view and the console's assistant are
 * all told about the company. The tiles' definitions live here too, so the person's info button and the agents read
 * the same words. The figures are worked out on the server (`homeData` in `src/views/home-parts.ts`); this file only
 * says them, so the page's client builds the same text from the same data.
 */
import type { DailyPoint, Totals } from '@/data/sample';
import { formatCompact, formatCost, formatDuration, formatPercent, ordinal } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { sameWeekdayBaseline, weekday, median } from '@/lib/insight';
import { PERIOD_DAYS, PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { STATE, against, factInsight, inDays, worst, type PageHead, type ServiceNow } from './fact-insight';

/** The traffic's four figures, each label and what it counts: Home's tiles draw them, and Usage's context states the first three. The tile's info button shows `hint`; the agents read it too. */
export const HOME_METRICS = {
  requests: { label: 'Requests', hint: 'Every call answered, at any status.' },
  errorRate: { label: 'Error rate', hint: 'Share of requests answered with a 5xx or a 429.' },
  p95: { label: 'Latency p95', hint: '95 of every 100 requests finished faster.' },
  revenue: { label: 'Revenue', hint: 'Billed for metered usage, before credits.' },
} as const;

/** The company's figures Home states beside them, each with its label and what it counts, for the tiles and the agents alike. */
export const COMPANY_METRICS = {
  customers: { label: 'Customers', hint: 'With a live key, less those that left.' },
  tokens: { label: 'Tokens served', hint: 'Input and output, every model.' },
  band: { label: 'Days inside the band', hint: 'Complete days whose p95 and error rate stayed under the band.' },
  compute: { label: 'Compute in use', hint: 'GPU-hours used of those provisioned.' },
  computeCost: { label: 'Compute cost', hint: 'What the GPUs provisioned cost.' },
  grossMargin: { label: 'Gross margin', hint: 'Revenue less compute cost, over revenue.' },
  sold: { label: 'What we sell', hint: 'Revenue by model.' },
} as const;

/** A period's days as the rows of a file: one flat row a day, with the day's revenue by plan in a column each. */
export const dayRows = (series: DailyPoint[]) => series.map(({ revenueByPlan, ...d }) => ({ ...d, revenueEnterprise: revenueByPlan.Enterprise, revenueScale: revenueByPlan.Scale, revenueStarter: revenueByPlan.Starter }));

/** One whole window of the period's length, counted back over every complete day kept: the year's card and revenue a period draw a column each. */
export type HomeWindow = { from: string; to: string; requests: number; p95: number; revenue: number };
/** A label and its figure, as a team's card lists them. A figure that could not be read is a dash. */
type HomeLine = { label: string; value: string };
/** A line worth knowing across the company, with the address where it is handled; the line that says there is none has none. */
export type WorthKnowing = { text: string; href?: string };
/** A figure of a tile, the same figure over the period before (null when none is kept) and its points, a day each. */
export type HomeFigure = { value: number; previous: number | null; points: number[] };

/**
 * What Home's read hands the page, its embed and its context: the figures, lines and points the parts draw, never a
 * row of the collections they come from. A part whose read failed is null, and `unread` names what could not be read.
 * Compute cost and gross margin are keys only for a person who may read what compute cost; for anyone else they are
 * absent, not null.
 */
export type HomeData = {
  period: Period;
  /** The period's complete days, oldest first and ending yesterday. */
  series: DailyPoint[];
  /** The period's totals and those of the same number of days before it; `previous` is null when no day before is kept, as with `all`. */
  totals: { current: Totals; previous: Totals | null };
  /** The day in progress, counted in none of the above; null when the latest day kept is complete. */
  running: DailyPoint | null;
  /** The page's title and the facts of a year, worked out on the server from every complete day kept (`homeHead`). */
  head: PageHead;
  /** The line under the title: customers, requests and their change, gross margin for a person who may read it, and the services (`homeLine`). */
  line: string | null;
  /** The revenue card: the period's revenue, a day's average, the best day, the record as its finding, and revenue a day with the day in progress apart. */
  revenue: (HomeFigure & { average: number; best: { date: string; value: number } | null; finding: string | null; running: number | null }) | null;
  /** The customers that have not left, by status, and the `all` fact as the tile's finding when one holds. */
  customers: { count: number; active: number; trial: number; pastDue: number; finding: string | null } | null;
  tokens: { value: number; requests: number } | null;
  requests: HomeFigure | null;
  /** The period's complete days inside the band (`steady` with `facts.band`). */
  band: { inside: number; of: number; text: string } | null;
  /** GPU-hours used over provisioned, as a share and as the hours themselves, and the fullest region. */
  compute: (HomeFigure & { used: number; provisioned: number; fullest: { region: string; value: number } | null }) | null;
  computeCost?: HomeFigure | null;
  grossMargin?: HomeFigure | null;
  /** The year's card and revenue a period: one window a column, oldest first, the card's title, and the windows' median p95 (null with no window). */
  year: { title: string; windows: HomeWindow[]; median: number | null } | null;
  /** What we sell: the period's revenue by model, the largest first. */
  sold: { key: string; label: string; value: number; share: number }[] | null;
  /** How many services are operational now, of how many, and each one that is not with its state. */
  services: { operational: number; of: number; unwell: string | null } | null;
  business: { lines: HomeLine[]; fact: string | null; href: string };
  engineering: { lines: HomeLine[]; fact: string | null; href: string };
  /** At most four lines, in their order; none when what they come from could not be read. */
  worth: WorthKnowing[];
  /** What could not be read, in words: "the usage by model". */
  unread: string[];
  updatedAt: string;
  now: string;
  /** The day the address names (`?day=`): the page opens pointed at it. */
  day?: string | null;
};

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDay = (iso: string) => formatDate(iso).replace(/ \d{4}$/, '');
const times = (r: number) => `${r.toFixed(1)}×`;
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

/** The labels of Engineering's lines the context states elsewhere: the services as a figure, the open incident as worth knowing. */
export const SERVICES_OPERATIONAL = 'Services operational';
export const INCIDENTS_OPEN = 'Incidents open';

/** Each service that is not operational with its state, those down first: "Files is down and Inference API is degraded". Null when every one is. */
export function unwellNames(services: readonly ServiceNow[]): string | null {
  const said = (['outage', 'degraded'] as const).flatMap((state) => services.filter((s) => s.status === state).map((s) => `${s.name} is ${STATE[state]}`));
  return said.length ? (said.length === 1 ? said[0] : `${said.slice(0, -1).join(', ')} and ${said.at(-1)}`) : null;
}

/**
 * The one line under the Home's title: the customers that have not left, the period's requests and their change, gross
 * margin when the reader may read it, and the services, each one that is not operational named with its state. A
 * record's title has no clause about the services, so what is wrong today is said here whatever the title says. A
 * clause whose figures could not be read is left out; null when none can be stated.
 */
export function homeLine({ days: n, customers, requests, previous, margin, services }: { days: number; customers: number | null; requests: number | null; previous: number | null; margin?: number | null; services: readonly ServiceNow[] | null }): string | null {
  const moved = requests !== null ? against(requests, previous) : null;
  const clauses = [
    customers !== null && `${formatCompact(customers)} ${customers === 1 ? 'customer' : 'customers'}`,
    requests !== null && n > 0 && `${formatCompact(requests)} requests in ${inDays(n)}${moved ? ` (${moved.way === 'level' ? 'level' : `${moved.way} ${moved.by}`})` : ''}`,
    typeof margin === 'number' && `a gross margin of ${formatPercent(margin, 1)}`,
    services && (unwellNames(services) ?? 'every service is operational'),
  ].filter((c): c is string => Boolean(c));
  if (!clauses.length) return null;
  const said = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(', ')}, and ${clauses.at(-1)}`;
  return `${said[0].toUpperCase()}${said.slice(1)}.`;
}

/** What a context says when no day is kept before the period: `all`, or a product's first days. */
export const NO_PREVIOUS = 'No previous period is kept, so no figure has a change.';

/**
 * "up 12.4% vs the previous 30 days (0.80%)": the relative change, its direction, and, given `format`, the figure it is
 * against. Nothing when there is no period before, or when its figure was zero. Home leaves the figure out, for its
 * budget: it states eleven figures where Usage states four.
 */
export function change(now: number, before: number | null | undefined, period: Period, format?: (n: number) => string): string | undefined {
  const n = PERIOD_DAYS[period];
  if (!n || !before) return undefined;
  const r = now / before - 1;
  const dir = Math.abs(r) < 0.0005 ? 'unchanged' : r > 0 ? 'up' : 'down';
  return `${dir}${dir === 'unchanged' ? '' : ` ${formatPercent(Math.abs(r), 1)}`} vs the previous ${n} days${format ? ` (${format(before)})` : ''}`;
}

/** "up 0.4 points vs the previous 30 days": a share's change, in percentage points, since a share of a share says little. */
function pointsChange(now: number, before: number | null | undefined, period: Period): string | undefined {
  const n = PERIOD_DAYS[period];
  if (!n || before === null || before === undefined) return undefined;
  const by = Math.abs(now - before) * 100;
  return `${by < 0.05 ? 'unchanged' : `${now > before ? 'up' : 'down'} ${by.toFixed(1)} points`} vs the previous ${n} days`;
}

/**
 * The year's card as the context says it: its title, then the latest window's p95. The latest window is the period
 * itself, whose requests the facts already state, so the title and its p95 stand for the windows.
 */
function yearInsight({ title, windows }: NonNullable<HomeData['year']>): Insight {
  const latest = windows.at(-1);
  return { text: latest ? `${title} (the latest window at ${formatDuration(latest.p95)}).` : `${title}.` };
}

/**
 * The Home's context for `data`, with the person pointing at day `index` of the series, or at nothing. It leads with
 * the head's figures (customers, requests, gross margin when the reader may read it, the services), then each part's
 * figure with its unit, change and definition, the title and the facts of a year, and the lines worth knowing. With a
 * day pointed at, the line about that day takes the place of the year's facts, so the text keeps to its budget.
 */
export function homeContext(data: HomeData, index: number | null = null): SharedContext {
  const { period, series } = data;
  const address = `/?period=${period}${index !== null && series[index] ? `&day=${series[index].date}` : ''}`;
  const label = PERIOD_LABEL[period].toLowerCase();
  const scope = series.length ? `${label}, ${formatDate(series[0].date)} to ${formatDate(series.at(-1)!.date)} (UTC days)` : label;
  const M = { ...HOME_METRICS, ...COMPANY_METRICS };
  const pct = (n: number) => formatPercent(n, 1);
  const count = (n: number) => n.toLocaleString('en-US');

  const facts: Fact[] = [];
  if (data.customers) {
    const { count: n, active, trial, pastDue } = data.customers;
    facts.push({ label: M.customers.label, value: `${n}: ${active} active, ${trial} on a trial, ${pastDue} past due`, definition: M.customers.hint });
  }
  if (data.requests) facts.push({ label: M.requests.label, value: count(data.requests.value), change: change(data.requests.value, data.requests.previous, period), definition: M.requests.hint });
  if (data.grossMargin) facts.push({ label: M.grossMargin.label, value: pct(data.grossMargin.value), change: pointsChange(data.grossMargin.value, data.grossMargin.previous, period), definition: M.grossMargin.hint });
  if (data.services) facts.push({ label: 'Services', value: `${data.services.operational} of ${data.services.of} operational${data.services.unwell ? `; ${data.services.unwell}` : ''}` });
  if (data.revenue) {
    const r = data.revenue;
    facts.push({ label: M.revenue.label, value: formatCost(r.value), change: change(r.value, r.previous, period), definition: M.revenue.hint });
    if (r.best) facts.push({ label: 'A day', value: `${formatCost(r.average)} of revenue; the best ${formatCost(r.best.value)} on ${formatDate(r.best.date)}` });
  }
  if (data.tokens) facts.push({ label: M.tokens.label, value: formatCompact(data.tokens.value), definition: M.tokens.hint });
  if (data.band) facts.push({ label: M.band.label, value: data.band.text });
  if (data.compute) {
    const k = data.compute;
    facts.push({ label: M.compute.label, value: `${pct(k.value)}${k.fullest ? `; the fullest ${k.fullest.region}, ${pct(k.fullest.value)}` : ''}`, definition: M.compute.hint });
  }
  if (data.computeCost) facts.push({ label: M.computeCost.label, value: formatCost(data.computeCost.value), change: change(data.computeCost.value, data.computeCost.previous, period), definition: M.computeCost.hint });
  if (data.sold) facts.push({ label: M.sold.label, value: data.sold.map((m) => `${m.label} ${pct(m.share)}`).join(', '), definition: M.sold.hint });
  // The team's lines that no other figure here states: the releases and the tickets. The services are stated above, and
  // the open incident is worth knowing below.
  const engineering = data.engineering.lines.filter((l) => l.label !== SERVICES_OPERATIONAL && l.label !== INCIDENTS_OPEN && l.value !== '—');
  if (engineering.length) facts.push({ label: 'Engineering', value: engineering.map((l, i) => `${i ? l.label.toLowerCase() : l.label} ${l.value}`).join(', ') });

  // The title first, as the page is headed; then the year, its facts or the day pointed at, and the lines worth knowing.
  const insights: Insight[] = data.head.title ? [{ text: data.head.title }] : [];
  if (data.year) insights.push(yearInsight(data.year));
  const pointed = index !== null ? series[index] : undefined;
  if (!pointed) insights.push(...data.head.facts.map(factInsight));
  if (data.customers?.finding) insights.push({ text: `All: ${data.customers.finding}.` });
  insights.push(...data.worth.map((w) => ({ text: w.text.endsWith('.') ? w.text : `${w.text}.`, evidence: w.href })));

  const unknowns: string[] = [];
  if (data.unread.length) unknowns.push(`${data.unread.length === 1 ? data.unread[0] : `${data.unread.slice(0, -1).join(', ')} and ${data.unread.at(-1)}`} could not be read, so what ${data.unread.length === 1 ? 'it states' : 'they state'} is missing, not zero.`.replace(/^./, (s) => s.toUpperCase()));
  if (data.head.unknown) unknowns.push(data.head.unknown);
  if (!series.length && !data.unread.includes('the days')) unknowns.push('No requests have arrived in this period, so there is nothing to compare.');
  if (series.length && !data.totals.previous) unknowns.push(NO_PREVIOUS);
  // The day in progress is in no figure above: the period ends yesterday. One short line, for the context's budget.
  if (data.running) unknowns.push(`${shortDay(data.running.date)} is in progress and counted in no total.`);

  let focus: string | undefined;
  if (pointed && index !== null) {
    const d = pointed;
    const requests = series.map((x) => x.requests);
    const errorRate = series.map((x) => (x.requests ? x.errors / x.requests : 0));
    const usual = sameWeekdayBaseline(requests, series.map((x) => x.date), index);
    const wd = WEEKDAY[weekday(d.date)];
    focus = `${formatDate(d.date)}, a ${wd}: ${count(d.requests)} requests${usual ? ` (${times(d.requests / usual)} the median ${wd})` : ''}; error rate ${formatPercent(errorRate[index], 2)} (${times(errorRate[index] / median(errorRate))} the period's median); latency p95 ${formatDuration(d.p95)} (${times(d.p95 / median(series.map((x) => x.p95)))} the median); revenue ${formatCost(d.revenue)}.`;
  }

  return { view: 'home', title: 'Home', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}


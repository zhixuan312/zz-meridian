/**
 * Usage' shared context (decision 0011): how many requests the period had and the facts about it, when they come,
 * where from, what is asked for and how it was answered, as both agents read it. The figures are worked out on the
 * server (`usageData` in `src/views/usage-parts.ts`); this file only says them, so the page's client builds the same
 * text from the same data.
 */
import type { DailyPoint, Endpoint, Totals } from '@/data/sample';
import type { UsageFigures } from '@/data/usage';
import { formatCompact, formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { against, factInsight, inDays, type PageHead } from './fact-insight';
import { HOME_METRICS, NO_PREVIOUS, change } from './home-context';

/** Each part's title, as its card is headed. The context names the parts by the same words. */
export const USAGE_PARTS = {
  byDay: 'Requests a day',
  year: 'A year of requests, a day a cell',
  counted: 'The period, counted',
  when: 'When they come',
  where: 'Where from',
  asked: 'What is asked for',
  answered: 'How it was answered',
} as const;

/** The two ways "When they come" counts the last 30 days, By hour first. */
export type When = 'hour' | 'week';
export const WHEN: { value: When; label: string }[] = [{ value: 'hour', label: 'By hour' }, { value: 'week', label: 'By weekday and hour' }];

/** How many endpoints "What is asked for" names before it folds the rest into one row. */
export const ASKED = 5;

/**
 * What Usage's read hands the page and its context: the figures, lines and points the parts draw. A part whose read
 * failed is null, and `unread` names what could not be read; the rest stands.
 */
export type UsageData = {
  period: Period;
  /** The day the address names (`?day=`): the page opens pointed at it. */
  day: string | null;
  /** The page's title and the facts of the period, worked out on the server from every complete day kept (`usageHead`). */
  head: PageHead;
  /** The line under the title: requests a day, the share answered with an error and the median day's p95 (`usageLine`). */
  line: string | null;
  /** The period's complete days, oldest first and ending yesterday, their totals and those of as many days before, and the day in progress on its own. */
  days: { series: DailyPoint[]; totals: { current: Totals; previous: Totals | null }; running: DailyPoint | null } | null;
  /** Every complete day kept and the day in progress, a value each, oldest first; the busiest complete day, null when none is kept. */
  calendar: { days: { date: string; value: number }[]; running: boolean; busiest: { date: string; value: number } | null } | null;
  /** When they come and where from, over the last 30 complete days. */
  figures: UsageFigures | null;
  /** Each endpoint over the last 30 complete days, the most requested first. */
  endpoints: Endpoint[] | null;
  /** Responses by status class over the last 30 complete days, 2xx first. */
  responses: { label: string; value: number }[] | null;
  /** What could not be read, in words: "the responses". */
  unread: string[];
  updatedAt: string;
  now: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** "02 Oct": a day in a badge or a short line, the year left to the date beside it. */
export const shortDate = (date: string) => formatDate(date).replace(/ \d{4}$/, '');
const count = (n: number) => n.toLocaleString('en-US');

/**
 * Usage's title, from plain figures: the period's requests, as the busiest period yet when it is a record, otherwise
 * against the period before, or alone when no period comes before.
 */
export function usageTitle({ days, requests, previous, record: latest }: { days: number; requests: number; previous: number | null; record: { run: number } | null }): string {
  const period = inDays(days);
  const said = `${formatCompact(requests)} requests in ${period}`;
  if (latest) return `${said}, the busiest ${period} yet`;
  const moved = against(requests, previous);
  if (!moved) return said;
  return moved.way === 'level' ? `${said}, level with the ${period} before` : `${said}, ${moved.by} ${moved.way === 'up' ? 'more' : 'less'} than the ${period} before`;
}

/** The line under Usage's title, from the period's complete days: requests a day, the share answered with an error, and the median day's p95. Null with no day. */
export function usageLine({ days, totals }: { days: number; totals: Totals }): string | null {
  if (!days) return null;
  return `${formatCompact(totals.requests / days)} requests a day, ${formatPercent(totals.errorRate, 2)} of them errors, and a median day's p95 of ${formatDuration(totals.p95)}.`;
}

/** What the status classes are, as "How it was answered" colours them: the expected outcome the quietest, those that need somebody in status colours. */
export const STATUS_COLOR = { '2xx': 'neutral', '3xx': 'neutral-ink', '4xx': 'warning', '5xx': 'critical' } as const;

/** The parts' figures as the context states them, each with the window it covers. */
function partFacts(data: UsageData): Fact[] {
  const facts: Fact[] = [];
  const { calendar, figures, endpoints, responses } = data;
  if (calendar?.busiest) facts.push({ label: 'Busiest day kept', value: `${formatDate(calendar.busiest.date)}, ${count(calendar.busiest.value)} requests, of ${calendar.days.length - (calendar.running ? 1 : 0)} complete days` });
  if (figures) {
    const cells = figures.heat.flatMap((row, d) => row.map((v, h) => ({ v, d, h })));
    const peak = cells.reduce((m, c) => (c.v > m.v ? c : m));
    const hour = figures.hours.reduce((m, c) => (c.value > m.value ? c : m));
    facts.push({ label: `${USAGE_PARTS.when}, the last 30 days`, value: `the busiest hour ${hour.label} UTC, every weekday summed; the busiest of the week ${DAYS[peak.d]} ${String(peak.h).padStart(2, '0')}:00 UTC, ${formatCompact(peak.v)} requests` });
    const whole = figures.regions.reduce((s, r) => s + r.value, 0);
    facts.push({ label: `${USAGE_PARTS.where}, the last 30 days`, value: figures.regions.map((r) => `${r.label} ${formatPercent(whole ? r.value / whole : 0, 0)} (p50 ${formatDuration(r.p50)})`).join(', '), definition: 'p50 is the median latency: half of the requests finished faster.' });
  }
  if (endpoints?.length) {
    // As the Bar list draws them: the five most requested, and one row past five as itself.
    const ranked = [...endpoints].sort((a, b) => b.requests - a.requests);
    const cut = ranked.length === ASKED + 1 ? ASKED + 1 : ASKED;
    const rest = ranked.slice(cut);
    const named = ranked.slice(0, cut).map((e) => `${e.method} ${e.route} ${formatCompact(e.requests)}`);
    if (rest.length) named.push(`${rest.length} ${plural(rest.length, 'other')} ${formatCompact(rest.reduce((s, e) => s + e.requests, 0))}`);
    facts.push({ label: `${USAGE_PARTS.asked}, the last 30 days`, value: named.join(', ') });
  }
  if (responses?.length) {
    const whole = responses.reduce((s, r) => s + r.value, 0);
    facts.push({ label: `${USAGE_PARTS.answered}, the last 30 days`, value: responses.map((r) => `${r.label} ${formatPercent(whole ? r.value / whole : 0, 2)}`).join(', '), definition: 'Responses by status class.' });
  }
  return facts;
}

/**
 * Usage' context, with the person pointing at day `index` of the Meridian's days (the period's, then the day in
 * progress), or at nothing. It leads with the title and the first, then the period's figures with their change and
 * the parts' figures with their windows, then the other facts of the period.
 */
export function usageContext(data: UsageData, index: number | null = null): SharedContext {
  const { days } = data;
  const series = days?.series ?? [];
  const label = PERIOD_LABEL[data.period].toLowerCase();
  const scope = series.length ? `${label}, ${formatDate(series[0].date)} to ${formatDate(series.at(-1)!.date)} (UTC)` : label;

  const facts: Fact[] = [];
  if (days && series.length) {
    const { current: c, previous: p } = days.totals;
    const M = HOME_METRICS;
    const pct = (n: number) => formatPercent(n, 2);
    facts.push(
      { label: M.requests.label, value: count(c.requests), change: change(c.requests, p?.requests, data.period, count), definition: M.requests.hint },
      { label: M.errorRate.label, value: pct(c.errorRate), change: change(c.errorRate, p?.errorRate, data.period, pct), definition: M.errorRate.hint },
      { label: M.p95.label, value: `${formatDuration(c.p95)} on the median day`, change: change(c.p95, p?.p95, data.period, formatDuration), definition: M.p95.hint },
    );
  }
  facts.push(...partFacts(data));

  // The title, then the first, then the period's other facts: the order a reader is told what the page states.
  const stated = [...data.head.facts].sort((a, b) => Number(b.kind === 'first') - Number(a.kind === 'first'));
  const insights: Insight[] = [...(data.head.title ? [{ text: data.head.title }] : []), ...stated.map(factInsight)];

  const unknowns: string[] = [];
  if (data.unread.length) unknowns.push(`${data.unread.length === 1 ? data.unread[0] : `${data.unread.slice(0, -1).join(', ')} and ${data.unread.at(-1)}`} could not be read, so what ${data.unread.length === 1 ? 'it states' : 'they state'} is missing, not zero.`.replace(/^./, (s) => s.toUpperCase()));
  if (data.head.unknown) unknowns.push(data.head.unknown);
  if (days && !series.length) unknowns.push('No requests have arrived in this period, so there is nothing to compare.');
  if (series.length && !days?.totals.previous) unknowns.push(NO_PREVIOUS);
  if (days?.running) unknowns.push(`${shortDate(days.running.date)} is in progress and counted in no total.`);
  if (data.figures || data.endpoints || data.responses) unknowns.push('The hours, the regions, the endpoints and the responses cover the last 30 complete days: they do not follow the period, and none shows a single day.');

  let focus: string | undefined;
  const pointed = index !== null ? [...series, ...(days?.running ? [days.running] : [])][index] : undefined;
  if (pointed) focus = `${formatDate(pointed.date)}: ${count(pointed.requests)} requests${pointed === days?.running ? ' so far' : ''} and ${count(pointed.errors)} errors (${formatPercent(pointed.requests ? pointed.errors / pointed.requests : 0, 2)}).`;
  // The address names the day the person points at, as Home's does.
  const address = `/usage?period=${data.period}${pointed ? `&day=${pointed.date}` : ''}`;

  return { view: 'usage', title: 'Usage', address, scope, freshness: freshnessOf(data.updatedAt, data.now), focus, facts, insights, unknowns };
}

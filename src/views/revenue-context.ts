/**
 * Revenue's shared context (decision 0011): what the console page and the console's assistant are told about the money
 * and who pays it. The parts' labels and definitions live here, so a tile's info button and the agents read the same
 * words. The figures are worked out on the server (`revenueData` in `src/views/revenue-parts.ts`); this file only says
 * them, so the page's client builds the same text from the same data.
 */
import { facts as rules } from '@/app.config';
import type { CustomerRecord, DailyPoint, Plan } from '@/data/sample';
import { periods, record } from '@/lib/facts';
import { FORMATTERS, formatCompact, formatCost, formatPercent, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { PERIOD_DAYS, PERIOD_LABEL, type Period } from '@/lib/period';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { CUSTOMER_METRICS, allSentMore, kept } from './customers-context';
import { HISTORY_UNREAD, against, inDays, type PageHead } from './fact-insight';
import { HOME_METRICS, NO_PREVIOUS, change } from './home-context';

/** The four tiles and the parts' titles, each with what it counts: the info buttons show `hint` and the agents read it. */
export const REVENUE_METRICS = {
  revenue: { label: 'Revenue', hint: HOME_METRICS.revenue.hint },
  yearAgo: { label: 'Against a year ago', hint: 'The period against the same days 52 weeks before, or the earliest whole window of its length kept.' },
  best: { label: 'Best day yet', hint: 'The complete day kept with the most revenue.' },
  pastDue: { label: 'Past due', hint: CUSTOMER_METRICS.pastDue.hint },
  byDay: { label: 'Revenue a day by plan' },
  whoPays: { label: 'Who pays', hint: 'Each plan\'s share of the period\'s revenue.' },
  byWindow: { label: 'Revenue a period, by plan' },
  wall: { label: 'Every customer, the last 14 days' },
  ladder: { label: 'From a trial to Enterprise' },
  worth: { label: 'Worth a look' },
  sold: { label: 'What they buy', hint: 'The period\'s revenue by model.' },
  regions: { label: 'Where they are', hint: 'Requests by region over the last 30 complete days.' },
} as const;

/** The stages of the ladder, from a trial up: a customer on a trial is on its first, whatever its plan, and each other on its plan's. */
export const STAGES = ['On a trial', 'Starter', 'Scale', 'Enterprise'] as const;
export type Stage = (typeof STAGES)[number];

/** The wall's three orders, Largest first: the one a page opens on. */
export const WALL_ORDERS = [
  { value: 'largest', label: 'Largest' },
  { value: 'fell', label: 'Fell this week' },
  { value: 'growing', label: 'Growing fastest' },
] as const;
export type WallOrder = (typeof WALL_ORDERS)[number]['value'];

/** A customer as the wall draws it: its name, plan, what it paid in 30 days, this week against last and its 14 days. */
export type WallTile = { id: string; name: string; plan: Plan; revenue: number; week: number | null; trend: number[] };
/** A customer as its stage lists it, with the share it pays of what the next stage's smallest customer pays, when that share is `facts.nextPlanAt` or more. */
export type LadderRow = { id: string; name: string; revenue: number; next: { stage: Stage; share: number } | null };

/** How close a customer is to the next plan, as its row in the ladder says it. */
export const nextPlanWords = ({ stage, share }: { stage: Stage; share: number }) => `pays ${formatPercent(share, 0)} of what the smallest ${stage} customer pays`;
/** A line worth a look; where it names a customer, the name as the line writes it and the customer's page. */
export type WorthLine = { text: string; customer?: { name: string; href: string } };

/**
 * What Revenue's read hands the page and its context: the figures, lines and points the parts draw, never a row of
 * the collections they come from. A part whose read failed is null, and `unread` names what could not be read.
 * `days` is what the period control moves; `customers` covers the windows a customer's figures cover, whatever the
 * period.
 */
export type RevenueData = {
  period: Period;
  /** The page's title, worked out on the server from every complete day kept and every customer (`revenueHead`). */
  head: PageHead;
  /** The line under the title: the customers by status, and the plan that brings the most of the period's revenue (`revenueLine`). */
  line: string | null;
  days: {
    /** The period's complete days, oldest first and ending yesterday, and the day in progress, counted in none of them. */
    series: DailyPoint[];
    running: DailyPoint | null;
    /** The period's revenue, the same number of days before it (null when none is kept), and the record as its finding. */
    revenue: { value: number; previous: number | null; finding: string | null };
    /** The period against the window a year before, or the earliest whole window kept (`first`); null when no earlier whole window is kept. */
    yearAgo: { change: number; from: string; to: string; first: boolean } | null;
    /** The best complete day kept, when `record` holds for it, and how many of the best days kept fall in the period. */
    best: { value: number; date: string; text: string; inPeriod: number; of: number } | null;
    /** The period's revenue by plan, in the order of `PLANS`. */
    byPlan: { plan: Plan; revenue: number }[];
    /** Each whole window of the period's length kept, oldest first, with its revenue by plan in the order of `PLANS`. */
    windows: { from: string; to: string; byPlan: number[] }[];
  } | null;
  customers: {
    /** The customers that have not left, and how many of them are on each plan. */
    count: number;
    trial: number;
    byPlan: Record<Plan, number>;
    /** How many are past due, and their share of the revenue of the last 30 complete days. */
    pastDue: { count: number; share: number };
    /** The eight each order picks, and how many of every customer sent more this week than last. */
    wall: { orders: Record<WallOrder, WallTile[]>; sentMore: number; of: number };
    /**
     * Each stage's two that paid the most (three when it holds exactly three), and what each other customer of it
     * paid: the Bar list folds those into "N others", summed. `line` counts who joined, moved up and left.
     */
    ladder: { stages: { label: Stage; shown: LadderRow[]; others: number[] }[]; line: string };
    worth: WorthLine[];
  } | null;
  /** What they buy: the period's revenue by model. */
  sold: { key: string; label: string; value: number }[] | null;
  /** Where they are: requests by region over the last 30 complete days. */
  regions: { label: string; value: number }[] | null;
  /** What could not be read, in words: "the usage by model". */
  unread: string[];
  updatedAt: string;
  now: string;
};

/**
 * Revenue's title, from plain figures. When every customer of a set sent more this week than last: how many, with the
 * plan when the set is one, and that the period is the highest yet when it is. Otherwise how many customers paid how
 * much, against the period before, or alone when no period comes before.
 */
export function revenueTitle({ days, customers, revenue, previous, all: every, record: latest }: { days: number; customers: number; revenue: number; previous: number | null; all: { count: number; label: string } | null; record: { run: number } | null }): string {
  const period = inDays(days);
  if (every) return `All ${[every.count, every.label, plural(every.count, 'customer')].filter(Boolean).join(' ')} sent more this week than last${latest ? `, in the highest ${period} yet` : ''}`;
  const said = `${customers} ${plural(customers, 'customer')} paid ${formatCost(revenue)} in ${period}`;
  const moved = against(revenue, previous);
  if (!moved) return said;
  return moved.way === 'level' ? `${said}, level with the ${period} before` : `${said}, ${moved.by} ${moved.way === 'up' ? 'more' : 'less'} than the ${period} before`;
}

/**
 * What Revenue states at its head, worked out on the server, and the period's record, which the Revenue tile states as
 * its finding. `history` is every complete day kept, oldest first and ending yesterday, or null when it could not be
 * read: the revenue is of the period's days, against as many before. A record compares the period with each earlier
 * whole window of its length. The "all" is tried on every customer that has not left, then on each plan, the plan
 * that brings the most revenue first.
 */
export function revenueHead({ period, rows, history }: { period: Period; rows: readonly Pick<CustomerRecord, 'plan' | 'status' | 'revenue' | 'trend'>[]; history: readonly DailyPoint[] | null }): PageHead & { record: string | null } {
  if (!history) return { title: null, facts: [], unknown: HISTORY_UNREAD, record: null };
  const counted = kept([...rows]);
  // The days the period covers: its length, or every day kept where fewer are, as with All.
  const days = Math.min(PERIOD_DAYS[period] ?? history.length, history.length);
  // Each whole window of revenue, to the cent, oldest first: the latest is the title's figure and the one before it what it is against.
  const windows = periods(history.map((d) => d.revenue), days).map((sum) => Math.round(sum * 100) / 100);
  const latest = windows.length ? record(windows, { needs: rules.recordNeedsPeriods, what: `${inDays(days)} of revenue`, format: formatCost }) : null;
  if (!windows.length || !counted.length) return { title: null, facts: [], record: latest?.text ?? null };
  return {
    title: revenueTitle({ days, customers: counted.length, revenue: windows.at(-1)!, previous: windows.at(-2) ?? null, all: allSentMore(counted), record: latest }),
    facts: [],
    record: latest?.text ?? null,
  };
}

/**
 * The line under Revenue's title: the customers that have not left by how they stand, and the plan that brings the
 * most of the period's revenue with its share. A clause whose figures could not be read is left out; null when none can be.
 */
export function revenueLine({ customers, byPlan, period }: { customers: { count: number; trial: number; pastDue: number } | null; byPlan: { plan: Plan; revenue: number }[] | null; period: Period }): string | null {
  const whole = byPlan?.reduce((s, p) => s + p.revenue, 0) ?? 0;
  const most = whole && byPlan ? byPlan.reduce((m, p) => (p.revenue > m.revenue ? p : m)) : null;
  const clauses = [
    customers && `${formatCompact(customers.count)} ${plural(customers.count, 'customer')}, ${customers.trial} on a trial and ${customers.pastDue} past due`,
    most && `${most.plan} brings ${formatPercent(most.revenue / whole, 1)} of the revenue of ${PERIOD_DAYS[period] ? `the last ${inDays(PERIOD_DAYS[period])}` : 'every day kept'}`,
  ].filter((c): c is string => Boolean(c));
  return clauses.length ? `${clauses.join('; ')}.` : null;
}

/** "08 Oct to 06 Nov 2025", "08 Oct 2025 to 05 Jan 2026": a window, its year said once when both ends share it. */
function between(from: string, to: string): string {
  const a = formatDate(from), b = formatDate(to);
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} to ${b}` : `${a} to ${b}`;
}

/** What the period is against, a year ago, in words: the window it names and why that one. */
export function yearAgoWords(y: NonNullable<RevenueData['days']>['yearAgo'], period: Period): string {
  const n = PERIOD_DAYS[period];
  if (!n) return 'The period is every day kept, so none comes before it';
  if (!y) return `No whole ${inDays(n)} before the period is kept`;
  return `against ${between(y.from, y.to)}, ${y.first ? `the first ${inDays(n)} kept` : '52 weeks before'}`;
}

/** A change as a tile's figure says it, with its sign: "+12.3%", "−4.0%". */
export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatPercent(Math.abs(n), 1)}`;

const costCompact = FORMATTERS['cost-compact'];
const weekWords = (w: number | null) => (w === null ? 'no week before' : signed(w));

/**
 * Revenue's context for `data`, with the wall in `order`. It leads with the title, then each part's figures with their
 * units, changes, definitions and windows, then the lines worth a look. It carries neither the windows of revenue a
 * period by plan, nor the wall's orders not chosen, nor the customers a stage folds.
 */
export function revenueContext(data: RevenueData, order: WallOrder = 'largest'): SharedContext {
  const { period, days, customers: c } = data;
  const M = REVENUE_METRICS;
  const label = PERIOD_LABEL[period].toLowerCase();
  const series = days?.series ?? [];
  const scope = `${series.length ? `${label}, ${between(series[0].date, series.at(-1)!.date)} (UTC days)` : label}; a customer's figures cover 30 complete days, its trend 14, this week the last 7 vs the 7 before`;

  const facts: Fact[] = [];
  if (days) {
    const r = days.revenue;
    facts.push({ label: M.revenue.label, value: formatCost(r.value), change: change(r.value, r.previous, period), definition: M.revenue.hint });
    facts.push({ label: M.yearAgo.label, value: days.yearAgo ? `${signed(days.yearAgo.change)} ${yearAgoWords(days.yearAgo, period)}` : yearAgoWords(null, period) });
    if (days.best) facts.push({ label: M.best.label, value: `${formatCost(days.best.value)} on ${formatDate(days.best.date)}; ${days.best.inPeriod} of the ${days.best.of} best kept are in the period` });
    const whole = days.byPlan.reduce((s, p) => s + p.revenue, 0);
    facts.push({ label: M.whoPays.label, value: days.byPlan.map((p) => `${p.plan} ${costCompact(p.revenue)}, ${formatPercent(whole ? p.revenue / whole : 0, 1)}${c ? `, ${c.byPlan[p.plan]} ${plural(c.byPlan[p.plan], 'customer')}` : ''}`).join('; ') });
  }
  if (c) {
    facts.push({ label: M.pastDue.label, value: `${c.pastDue.count}, ${formatPercent(c.pastDue.share, 1)} of the revenue of the last 30 days`, definition: M.pastDue.hint });
    const shown = WALL_ORDERS.find((o) => o.value === order)!.label.toLowerCase();
    facts.push({ label: M.wall.label, value: `${c.wall.sentMore} of ${c.wall.of} sent more this week than last; ${shown}: ${c.wall.orders[order].map((t) => `${t.name} ${costCompact(t.revenue)} ${weekWords(t.week)}`).join(', ')}` });
    facts.push({
      label: M.ladder.label,
      value: `${c.ladder.stages.map((s) => `${s.label} ${s.shown.length + s.others.length}: ${s.shown.map((x, i) => `${x.name} ${costCompact(x.revenue)}${x.next ? ` (${formatPercent(x.next.share, 0)}${i ? '' : ` of the smallest ${x.next.stage}`})` : ''}`).join(', ')}${s.others.length ? ` and ${s.others.length} others` : ''}`).join('; ')}. ${c.ladder.line}`,
    });
  }
  if (data.sold) facts.push({ label: M.sold.label, value: data.sold.map((m) => `${m.label} ${costCompact(m.value)}`).join(', ') });
  if (data.regions) facts.push({ label: M.regions.label, value: data.regions.map((r) => `${r.label} ${formatCompact(r.value)}`).join(', '), definition: M.regions.hint });

  const insights: Insight[] = data.head.title ? [{ text: data.head.title }] : [];
  if (days?.revenue.finding) insights.push({ text: `Record: ${days.revenue.finding}.` });
  if (c) insights.push(...c.worth.map((w) => ({ text: `${w.text}.`, evidence: w.customer?.href })));

  const unknowns: string[] = [];
  if (data.unread.length) unknowns.push(`${data.unread.length === 1 ? data.unread[0] : `${data.unread.slice(0, -1).join(', ')} and ${data.unread.at(-1)}`} could not be read, so what ${data.unread.length === 1 ? 'it states' : 'they state'} is missing, not zero.`.replace(/^./, (s) => s.toUpperCase()));
  if (data.head.unknown) unknowns.push(data.head.unknown);
  if (days && !series.length && c && !c.count) unknowns.push('Nothing has arrived yet: no customer and no complete day is kept.');
  if (series.length && days?.revenue.previous === null) unknowns.push(NO_PREVIOUS);
  if (days?.running) unknowns.push(`${formatDate(days.running.date)} is in progress and counted in no total.`);

  return { view: 'revenue', title: 'Revenue', address: `/business?period=${period}`, scope, freshness: freshnessOf(data.updatedAt, data.now), facts, insights, unknowns };
}

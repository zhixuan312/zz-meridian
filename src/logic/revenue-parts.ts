/**
 * What Revenue states, worked out on the server from what its read could read: the title, the line under it, and each
 * part's figures, lines and points (`RevenueData`). Pure: it is handed rows and returns figures, so the read in
 * `src/logic/tools.ts` and a test build Revenue the same way, and no customer's record reaches the browser.
 *
 * A read that failed is handed as null: its part is null, `unread` names it, and the rest stands. The period moves
 * what is read from the daily records; every part about customers covers the windows a customer's figures cover (30
 * complete days for what it paid, 14 for its trend, the last 7 against the 7 before for this week), whatever the period.
 */
import { facts as rules } from '@/app.config';
import { PLANS, type CustomerRecord, type DailyPoint, type Model, type Plan, type UsageRow } from '@/data/sample';
import { record } from '@/lib/facts';
import { formatCost, formatPercent } from '@/lib/format';
import { dayOf, formatDate, shiftDay } from '@/lib/format-date';
import { PERIOD_DAYS, type Period } from '@/lib/period';
import type { Totals } from '@/lib/totals';
import { customerFigures, kept, sentMore, week } from './customers-context';
import { windowsOf } from './home-parts';
import { STAGES, revenueHead, revenueLine, type LadderRow, type RevenueData, type Stage, type WallOrder, type WallTile, type WorthLine } from './revenue-context';
import { customerAddress } from './customer-context';

/** How many tiles the wall holds, customers a stage names, best days a tile counts and lines worth a look. */
const WALL = 8;
const NAMED = 2;
const BEST = 10;
const WORTH_LINES = 4;
/** The days ahead a trial's end is worth a look within, and the complete days the ladder's moves are counted over. */
const TRIAL_DAYS = 14;
const MOVE_DAYS = 30;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const cents = (n: number) => Math.round(n * 100) / 100;
const RANK: Record<Plan, number> = { Starter: 0, Scale: 1, Enterprise: 2 };
/** The stage a customer stands on, and the stage above each. */
const stageOf = (c: Pick<CustomerRecord, 'status' | 'plan'>): Stage => (c.status === 'trial' ? 'On a trial' : c.plan);
const NEXT: Record<Stage, Stage | null> = { 'On a trial': 'Starter', Starter: 'Scale', Scale: 'Enterprise', Enterprise: null };

/** What Revenue's read could read, each null when its read failed. */
export type RevenueReads = {
  period: Period;
  days: { series: DailyPoint[]; totals: { current: Totals; previous: Totals | null }; running: DailyPoint | null } | null;
  /** Every complete day kept, oldest first and ending yesterday. */
  history: DailyPoint[] | null;
  customers: CustomerRecord[] | null;
  usage: UsageRow[] | null;
  models: Model[] | null;
  regions: { label: string; value: number }[] | null;
  updatedAt: string;
  now: string;
};

/**
 * The period against a year ago: the same days 52 weeks before when every one of them is kept, otherwise the earliest
 * whole window of the period's length, so long as it ends before the period starts. Null for All, which has no window
 * before it, and when no such window is kept: a figure is never compared with a window it does not name.
 */
function yearAgoOf(history: readonly DailyPoint[], series: readonly DailyPoint[], period: Period): NonNullable<RevenueData['days']>['yearAgo'] {
  const n = PERIOD_DAYS[period];
  if (!n || series.length < n) return null;
  const byDate = new Map(history.map((d) => [d.date, d]));
  const before = series.map((d) => byDate.get(shiftDay(d.date, -364)));
  const year = before.every((d) => d !== undefined) ? (before as DailyPoint[]) : null;
  const window = year ?? (history.length >= 2 * n ? history.slice(0, n) : null);
  const then = window ? sum(window.map((d) => d.revenue)) : 0;
  if (!window || !then) return null;
  return { change: sum(series.map((d) => d.revenue)) / then - 1, from: window[0].date, to: window.at(-1)!.date, first: !year };
}

/**
 * The best complete day kept, as Home's busiest day is found: `record` over the days up to it, about it, so a best day
 * with too little history before it is no record and is not stated. With it, how many of the ten best days kept fall
 * in the period.
 */
function bestOf(history: readonly DailyPoint[], series: readonly DailyPoint[]): NonNullable<RevenueData['days']>['best'] {
  if (!history.length) return null;
  const at = history.reduce((m, d, i) => (d.revenue > history[m].revenue ? i : m), 0);
  const fact = record(history.slice(0, at + 1).map((d) => d.revenue), { needs: rules.recordNeedsPeriods, what: 'day of revenue', format: formatCost, day: history[at].date });
  if (!fact) return null;
  const inPeriod = new Set(series.map((d) => d.date));
  const top = [...history].sort((a, b) => b.revenue - a.revenue).slice(0, BEST);
  return { value: history[at].revenue, date: history[at].date, text: fact.text, inPeriod: top.filter((d) => inPeriod.has(d.date)).length, of: top.length };
}

/** The eight each order of the wall picks from every customer that has not left: the largest, those that fell most and those that grew most this week. */
function wallOf(counted: readonly CustomerRecord[]): Record<WallOrder, WallTile[]> {
  const tiles = counted.map((c): WallTile => ({ id: c.id, name: c.name, plan: c.plan, revenue: c.revenue, week: week(c.trend), trend: c.trend }));
  const moved = (way: 1 | -1) => tiles.filter((t) => t.week !== null && t.week * way > 0).sort((a, b) => way * (b.week! - a.week!));
  return { largest: [...tiles].sort((a, b) => b.revenue - a.revenue).slice(0, WALL), fell: moved(-1).slice(0, WALL), growing: moved(1).slice(0, WALL) };
}

/**
 * The ladder: each stage's customers, the two that paid the most named and the rest handed as what each paid, and the
 * line counting who joined, who moved up a plan and who left over the last 30 complete days. A named customer's line
 * says what share it pays of what the next stage's smallest customer pays, once that share is `facts.nextPlanAt` or
 * more, read now: a product that changes it changes who is said to be close.
 */
function ladderOf(rows: readonly CustomerRecord[], counted: readonly CustomerRecord[], today: string): NonNullable<RevenueData['customers']>['ladder'] {
  const at = rules.nextPlanAt;
  const members = new Map<Stage, CustomerRecord[]>(STAGES.map((s) => [s, counted.filter((c) => stageOf(c) === s).sort((a, b) => b.revenue - a.revenue)]));
  const smallest = (s: Stage | null) => {
    const paying = s ? members.get(s)!.filter((c) => c.revenue > 0) : [];
    return paying.length ? paying.at(-1)!.revenue : null;
  };
  const stages = STAGES.map((label) => {
    const all = members.get(label)!;
    // A stage of exactly three names all three: the Bar list shows one row past its limit as itself.
    const named = all.length === NAMED + 1 ? all : all.slice(0, NAMED);
    const next = NEXT[label], floor = smallest(next);
    const shown = named.map((c): LadderRow => {
      const share = floor ? c.revenue / floor : 0;
      return { id: c.id, name: c.name, revenue: c.revenue, next: next && floor && share >= at ? { stage: next, share } : null };
    });
    return { label, shown, others: all.slice(named.length).map((c) => c.revenue) };
  });
  const to = shiftDay(today, -1), from = shiftDay(to, -(MOVE_DAYS - 1));
  const inside = (d: string | null) => d !== null && d >= from && d <= to;
  const joined = counted.filter((c) => inside(c.joined)).length;
  const movedUp = counted.filter((c) => inside(c.planSince) && c.previousPlan !== null && RANK[c.plan] > RANK[c.previousPlan]).length;
  const left = rows.filter((c) => c.status === 'left' && inside(c.left)).length;
  const counts = (n: number, did: string) => `${n || 'none'} ${did}`;
  return { stages, line: `${counts(joined, 'joined')}, ${counts(movedUp, 'moved up')} and ${counts(left, 'left')} in the 30 days to ${formatDate(to)}` };
}

/**
 * The lines worth a look, in their order, at most four: the customers past due (the largest named), the trials that
 * end within 14 days (the first named), the largest rise of the week and the largest fall. One line when there is none.
 */
function worthOf(counted: readonly CustomerRecord[], today: string): WorthLine[] {
  const lines: WorthLine[] = [];
  const named = (c: Pick<CustomerRecord, 'id' | 'name'>) => ({ name: c.name, href: customerAddress(c.id) });
  const owing = counted.filter((c) => c.status === 'past due').sort((a, b) => b.revenue - a.revenue);
  if (owing.length) {
    const c = owing[0];
    lines.push({ text: owing.length === 1 ? `${c.name} is past due, billed ${formatCost(c.revenue)} in 30 days` : `${owing.length} customers are past due, the largest ${c.name}, billed ${formatCost(c.revenue)} in 30 days`, customer: named(c) });
  }
  const until = shiftDay(today, TRIAL_DAYS);
  const ending = counted.filter((c) => c.status === 'trial' && c.trialEnds !== null && c.trialEnds >= today && c.trialEnds <= until).sort((a, b) => a.trialEnds!.localeCompare(b.trialEnds!) || b.revenue - a.revenue);
  if (ending.length) {
    const c = ending[0];
    lines.push({ text: ending.length === 1 ? `The trial of ${c.name} ends on ${formatDate(c.trialEnds!)}` : `${ending.length} trials end within ${TRIAL_DAYS} days, the soonest ${c.name} on ${formatDate(c.trialEnds!)}`, customer: named(c) });
  }
  const weeks = counted.map((c) => ({ c, w: week(c.trend) })).filter((x): x is { c: CustomerRecord; w: number } => x.w !== null);
  const rise = weeks.reduce<(typeof weeks)[number] | null>((m, x) => (x.w > 0 && (!m || x.w > m.w) ? x : m), null);
  const fall = weeks.reduce<(typeof weeks)[number] | null>((m, x) => (x.w < 0 && (!m || x.w < m.w) ? x : m), null);
  if (rise) lines.push({ text: `${rise.c.name} sent ${formatPercent(rise.w, 1)} more this week than last, the largest rise`, customer: named(rise.c) });
  if (fall) lines.push({ text: `${fall.c.name} sent ${formatPercent(-fall.w, 1)} less this week than last, the largest fall`, customer: named(fall.c) });
  return lines.length ? lines.slice(0, WORTH_LINES) : [{ text: `No customer is past due, no trial ends within ${TRIAL_DAYS} days and no customer's week moved` }];
}

/** Revenue's data from what its read could read. */
export function revenueData(r: RevenueReads): RevenueData {
  const unread: string[] = [];
  const read = <T>(value: T | null, name: string): value is T => {
    if (value === null) unread.push(name);
    return value !== null;
  };
  const today = dayOf(r.now);
  const head = revenueHead({ period: r.period, rows: r.customers ?? [], history: r.history });

  let days: RevenueData['days'] = null;
  // The period's days and every day kept are one collection, read twice: the part needs both.
  const both = r.days && r.history ? { ...r.days, history: r.history } : null;
  if (read(both, 'the days')) {
    const { series, totals, running, history } = both;
    const plan = (rows: readonly DailyPoint[], p: Plan) => cents(sum(rows.map((d) => d.revenueByPlan[p])));
    days = {
      series,
      running,
      revenue: { value: totals.current.revenue, previous: totals.previous?.revenue ?? null, finding: head.record },
      yearAgo: yearAgoOf(history, series, r.period),
      best: bestOf(history, series),
      byPlan: PLANS.map((p) => ({ plan: p, revenue: plan(series, p) })),
      windows: windowsOf(history, PERIOD_DAYS[r.period] ?? history.length, (ds) => ({ byPlan: PLANS.map((p) => plan(ds, p)) })),
    };
  }

  let customers: RevenueData['customers'] = null;
  if (read(r.customers, 'the customers')) {
    const counted = kept(r.customers);
    const { revenue, pastDue } = customerFigures(counted);
    customers = {
      count: counted.length,
      trial: counted.filter((c) => c.status === 'trial').length,
      byPlan: Object.fromEntries(PLANS.map((p) => [p, counted.filter((c) => c.plan === p).length])) as Record<Plan, number>,
      pastDue: { count: pastDue.length, share: revenue ? sum(pastDue.map((c) => c.revenue)) / revenue : 0 },
      wall: { orders: wallOf(counted), sentMore: counted.filter((c) => sentMore(c.trend)).length, of: counted.length },
      ladder: ladderOf(r.customers, counted, today),
      worth: worthOf(counted, today),
    };
  }

  let sold: RevenueData['sold'] = null;
  // Both reads are tried, so each one that failed is named.
  const usageRead = read(r.usage, 'the usage by model'), modelsRead = read(r.models, 'the models');
  if (usageRead && modelsRead && r.usage && r.models) {
    // The period's complete days as the usage holds them, so what they buy covers the period whether the days were read or not.
    const complete = [...new Set(r.usage.map((u) => u.date))].filter((d) => d < today).sort();
    const n = PERIOD_DAYS[r.period] ?? complete.length;
    const inPeriod = new Set(n ? complete.slice(-n) : []);
    const usage = r.usage.filter((u) => inPeriod.has(u.date));
    sold = r.models.map((m) => ({ key: m.id, label: m.label, value: cents(sum(usage.filter((u) => u.model === m.id).map((u) => u.revenue))) }));
  }

  const regions = read(r.regions, 'the regions') ? r.regions.map(({ label, value }) => ({ label, value })) : null;

  return {
    period: r.period,
    head: { title: head.title, facts: head.facts, ...(head.unknown ? { unknown: head.unknown } : {}) },
    line: revenueLine({ customers: customers && { count: customers.count, trial: customers.trial, pastDue: customers.pastDue.count }, byPlan: days?.byPlan ?? null, period: r.period }),
    days,
    customers,
    sold,
    regions,
    unread,
    updatedAt: r.updatedAt,
    now: r.now,
  };
}

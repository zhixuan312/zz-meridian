/**
 * What Usage states, worked out on the server from what its read could read: the title and the facts of the period,
 * the line under the title, and each part's figures and points (`UsageData`). Pure: it is handed rows and returns
 * figures, so the read in `src/logic/tools.ts` and a test build Usage the same way, and the history reaches the
 * browser only as the calendar's values.
 *
 * A read that failed is handed as null: its part is null, `unread` names it, and the rest stands. The period moves
 * requests a day and the facts; the calendar covers every day kept; when they come, where from, what is asked for and
 * how it was answered cover the last 30 complete days, whatever the period.
 */
import { facts as rules } from '@/app.config';
import type { DailyPoint, Endpoint, Totals } from '@/data/sample';
import type { UsageFigures } from '@/data/usage';
import { first, periods, record, type Fact } from '@/lib/facts';
import { formatCompact } from '@/lib/format';
import { shiftDay } from '@/lib/format-date';
import { PERIOD_DAYS, type Period } from '@/lib/period';
import { HISTORY_UNREAD, handed, inDays, type PageHead } from './fact-insight';
import { weekdayAverages } from './home-parts';
import { usageLine, usageTitle, type UsageData } from './usage-context';

const count = (n: number) => n.toLocaleString('en-US');

/**
 * The facts of the period, each from a rule of `src/lib/facts.ts` over every complete day kept, in this order, at
 * most three: the busiest day yet, when it falls in the period; the first day requests passed the largest threshold
 * passed, with how many of the period's days passed it; and the weekday average of the period's latest week, when it is
 * the highest yet. `days` is how many of the latest days kept the period covers. A fact whose rule does not hold is
 * not stated, and none has a weaker thing in its place.
 */
function periodFacts(history: readonly DailyPoint[], days: number): Fact[] {
  const from = history[history.length - days].date;
  const requests = history.map((d) => ({ date: d.date, value: d.requests }));
  const busiest = requests.reduce((m, d, i) => (d.value > requests[m].value ? i : m), 0);
  const weeks = weekdayAverages(history);
  const week = weeks.at(-1);
  const passed = first(requests, { thresholds: rules.firsts.requestsADay, what: 'Requests', format: formatCompact, ...(days < history.length ? { period: days } : {}) });
  return [
    requests[busiest].date >= from ? record(requests.slice(0, busiest + 1).map((d) => d.value), { needs: rules.recordNeedsPeriods, what: 'day of requests', format: count, day: requests[busiest].date }) : null,
    // Where a person can see the first day: Home's year, opened at it.
    passed ? handed(passed, `/?period=all&day=${passed.day}`) : null,
    week && shiftDay(week.friday, -4) >= from ? record(weeks.map((w) => w.value), { needs: rules.recordNeedsPeriods, what: 'weekday average', format: (n) => `${count(Math.round(n))} requests a day`, day: week.friday, week: true }) : null,
  ].filter((f): f is Fact => f !== null).map((f) => (f.kind === 'first' ? f : handed(f)));
}

/** The days a period covers of every day kept: its length, or every day kept where fewer are, as with All. */
const coveredBy = (period: Period, history: readonly DailyPoint[]) => Math.min(PERIOD_DAYS[period] ?? history.length, history.length);

/**
 * The period's record for requests: the latest whole period against every earlier one of its length, or null. The
 * title says it in its words, and the Featured metric states its line as its finding.
 */
function periodRecord(period: Period, history: readonly DailyPoint[]) {
  const days = coveredBy(period, history);
  // `beside`: the card's figure and its caption both state this period's requests, so the record line says the record.
  return record(periods(history.map((d) => d.requests), days), { needs: rules.recordNeedsPeriods, what: `${inDays(days)} of requests`, format: formatCompact, beside: true });
}

/**
 * What Usage states at its head, worked out on the server: its title for the period, and the facts of the period.
 * `history` is every complete day kept, oldest first and ending yesterday, or null when it could not be read; the
 * period is its latest days.
 */
export function usageHead({ period, totals, history }: { period: Period; totals: { current: Totals; previous: Totals | null }; history: readonly DailyPoint[] | null }): PageHead {
  if (!history) return { title: null, facts: [], unknown: HISTORY_UNREAD };
  if (!history.length) return { title: null, facts: [] };
  const days = coveredBy(period, history);
  return {
    title: usageTitle({ days, requests: totals.current.requests, previous: totals.previous?.requests ?? null, record: periodRecord(period, history) }),
    facts: periodFacts(history, days),
  };
}

/** What Usage's read could read, each null when its read failed. */
export type UsageReads = {
  period: Period;
  /** The day the address names, or null. */
  day: string | null;
  days: { series: DailyPoint[]; totals: { current: Totals; previous: Totals | null }; running: DailyPoint | null } | null;
  /** Every complete day kept, oldest first and ending yesterday. */
  history: DailyPoint[] | null;
  figures: UsageFigures | null;
  endpoints: Endpoint[] | null;
  responses: { label: string; value: number }[] | null;
  updatedAt: string;
  now: string;
};

/** Usage's data from what its read could read. */
export function usageData(r: UsageReads): UsageData {
  const unread: string[] = [];
  const read = <T>(value: T | null, name: string): T | null => {
    if (value === null) unread.push(name);
    return value;
  };
  // What a part draws of the days, and nothing the browser has no use for.
  const days = read(r.days && { series: r.days.series, totals: r.days.totals, running: r.days.running }, 'the days');
  const history = read(r.history, 'the history');
  const totals = days?.totals ?? { current: { requests: 0, errorRate: 0, p95: 0, revenue: 0 }, previous: null };
  // A title compares the period's own totals, so it is worked out only when both were read.
  const head = days ? usageHead({ period: r.period, totals, history }) : { title: null, facts: [], ...(history ? {} : { unknown: HISTORY_UNREAD }) };
  // The calendar's last cell is the day in progress, which the days hand over on their own.
  const running = days?.running ?? null;
  const busiest = history?.length ? history.reduce((m, d) => (d.requests > m.requests ? d : m)) : null;
  return {
    period: r.period,
    day: r.day,
    head,
    // As the title: a record of the period's own days, so only when both were read.
    record: days && history?.length ? periodRecord(r.period, history)?.text ?? null : null,
    line: days ? usageLine({ days: days.series.length, totals: days.totals.current }) : null,
    days,
    calendar: history && {
      days: [...history.map((d) => ({ date: d.date, value: d.requests })), ...(running ? [{ date: running.date, value: running.requests }] : [])],
      running: running !== null,
      busiest: busiest && { date: busiest.date, value: busiest.requests },
    },
    figures: read(r.figures, 'the hours and the regions'),
    endpoints: read(r.endpoints, 'the endpoints'),
    responses: read(r.responses, 'the responses'),
    unread,
    updatedAt: r.updatedAt,
    now: r.now,
  };
}

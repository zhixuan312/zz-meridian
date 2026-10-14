/**
 * Revenue's shared context (decision 0011): its title and the three figures the page leads with, as both agents read
 * them. The body is the thin first form; the figures are the ones the Customers page computes, so the two cannot disagree.
 */
import { facts as rules } from '@/app.config';
import type { CustomerRecord, DailyPoint } from '@/data/sample';
import { all, periods, record } from '@/lib/facts';
import { formatCost, plural } from '@/lib/format';
import { freshnessOf, type Fact, type SharedContext } from '@/lib/shared-context';
import { CUSTOMER_METRICS, kept, pastDueFact, sentMore } from './customers-context';
import { HISTORY_UNREAD, against, headInsights, inDays, type PageHead } from './fact-insight';

/** The days Revenue's title covers: the last 30 complete ones, the window a customer's figures cover. */
const REVENUE_DAYS = 30;

export type RevenueData = {
  customers: number;
  revenue: number;
  pastDue: { name: string; revenue: number }[];
  /** The page's title, worked out on the server from every complete day kept and every customer (`revenueHead`). */
  head: PageHead;
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
 * What Revenue states at its head, worked out on the server. `history` is every complete day kept, oldest first and
 * ending yesterday, or null when it could not be read: the revenue is of its last 30 days, against the 30 before. The
 * "all" is tried on every customer that has not left, then on each plan, the plan that brings the most revenue first.
 */
export function revenueHead({ rows, history }: { rows: readonly Pick<CustomerRecord, 'plan' | 'status' | 'revenue' | 'trend'>[]; history: readonly DailyPoint[] | null }): PageHead {
  if (!history) return { title: null, facts: [], unknown: HISTORY_UNREAD };
  const counted = kept([...rows]);
  // Each whole 30 days of revenue, to the cent, oldest first: the latest is the title's figure and the one before it what it is against.
  const months = periods(history.map((d) => d.revenue), REVENUE_DAYS).map((sum) => Math.round(sum * 100) / 100);
  if (!months.length || !counted.length) return { title: null, facts: [] };
  const byPlan = new Map<string, typeof counted>();
  for (const c of counted) byPlan.set(c.plan, [...(byPlan.get(c.plan) ?? []), c]);
  const paid = (members: typeof counted) => members.reduce((sum, c) => sum + c.revenue, 0);
  const plans = [...byPlan].sort((a, b) => paid(b[1]) - paid(a[1])).map(([label, members]) => ({ label, members }));
  return {
    title: revenueTitle({
      days: REVENUE_DAYS,
      customers: counted.length,
      revenue: months.at(-1)!,
      previous: months.at(-2) ?? null,
      all: all([{ label: '', members: counted }, ...plans], (c) => sentMore(c.trend), { what: 'customers', did: 'sent more requests in the last 7 days than in the 7 before' }),
      record: record(months, { needs: rules.recordNeedsPeriods, what: `${inDays(REVENUE_DAYS)} of revenue`, format: formatCost }),
    }),
    facts: [],
  };
}

export function revenueContext({ customers, revenue, pastDue, head, updatedAt, now }: RevenueData): SharedContext {
  const M = CUSTOMER_METRICS;
  const facts: Fact[] = [
    { label: M.customers.label, value: String(customers), definition: M.customers.hint },
    { label: M.revenue.label, value: formatCost(revenue), definition: M.revenue.hint },
    { label: M.pastDue.label, value: pastDueFact(pastDue), definition: M.pastDue.hint },
  ];
  return {
    view: 'revenue',
    title: 'Revenue',
    address: '/business',
    scope: 'every customer that has not left, revenue over the last 30 days; this week is the last 7 days of a customer\'s requests against the 7 before',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights: headInsights(head),
    unknowns: [...(customers ? [] : ['There are no customers yet.']), ...(head.unknown ? [head.unknown] : []), 'This page holds three figures; who the customers are, their plans and their trends are on Customers (/customers).'],
  };
}

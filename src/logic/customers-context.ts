/**
 * Customers' shared context (decision 0011): who the customers are, where the revenue sits, who is moving and who has
 * not paid, as both agents read it. The columns the table drops on a narrow screen are still the person's to read.
 */
import type { CustomerRecord } from '@/data/sample';
import { all } from '@/lib/facts';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { median } from '@/lib/insight';
import { listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

type CustomersState = { q: string; plan: string; status: string; sort: string; dir: string; page: string };

/** The tiles' definitions: the info buttons show them and the agents read them. */
export const CUSTOMER_METRICS = {
  customers: { label: 'Customers', hint: 'Customers that have not left.' },
  revenue: { label: 'Revenue, last 30 days', hint: 'What every customer was billed for metered usage, before credits.' },
  pastDue: { label: 'Past due', hint: 'Customers whose latest invoice is overdue.' },
} as const;

/**
 * A customer's status as a tone, on the list and on the customer's own page: colour only where a row needs a look, past
 * due and trial. Active is the normal case, so it stays quiet, and a customer that has left is history.
 */
export const STATUS_TONE = { active: 'neutral', trial: 'accent', 'past due': 'critical', left: 'neutral' } as const satisfies Record<CustomerRecord['status'], string>;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** The last seven days of a 14-day trend against the seven before: the change a sparkline shows and a list does not say. */
export const week = (t: number[]) => (t.length >= 14 && sum(t.slice(0, 7)) ? sum(t.slice(7)) / sum(t.slice(0, 7)) - 1 : null);

/** Whether a customer sent more requests in the last seven days of its 14-day trend than in the seven before. */
export const sentMore = (t: readonly number[]) => t.length >= 14 && sum(t.slice(7)) > sum(t.slice(0, 7));

/**
 * The `all` fact about this week: every customer that has not left sent more requests in the last 7 days than in the 7
 * before, tried on every one of them first and then on each plan, the plan that brings the most revenue first. Revenue
 * heads its page with it and Home's Customers tile states it.
 */
export function allSentMore(rows: readonly Pick<CustomerRecord, 'plan' | 'status' | 'revenue' | 'trend'>[]) {
  const counted = kept([...rows]);
  const byPlan = new Map<string, typeof counted>();
  for (const c of counted) byPlan.set(c.plan, [...(byPlan.get(c.plan) ?? []), c]);
  const paid = (members: typeof counted) => members.reduce((s, c) => s + c.revenue, 0);
  const plans = [...byPlan].sort((a, b) => paid(b[1]) - paid(a[1])).map(([label, members]) => ({ label, members }));
  return all([{ label: '', members: counted }, ...plans], (c) => sentMore(c.trend), { what: 'customers', did: 'sent more requests in the last 7 days than in the 7 before' });
}

/** A customer as the list draws it: the fields of a row, and none of what only its own page shows. */
export type CustomerRow = Pick<CustomerRecord, 'id' | 'name' | 'plan' | 'status' | 'requests' | 'trend' | 'errorRate' | 'revenue' | 'joined'>;
export const customerRow = ({ id, name, plan, status, requests, trend, errorRate, revenue, joined }: CustomerRecord): CustomerRow => ({ id, name, plan, status, requests, trend, errorRate, revenue, joined });

/** The customers a figure counts: every one that has not left. One that has keeps its record and is in no count or sum. */
export const kept = <T extends Pick<CustomerRecord, 'status'>>(rows: T[]): T[] => rows.filter((c) => c.status !== 'left');

/** The three figures the tiles show and the assistant is told, worked out once from every customer the page read, less those that have left. */
export function customerFigures<T extends Pick<CustomerRecord, 'status' | 'revenue'>>(rows: T[]): { customers: number; revenue: number; pastDue: T[] } {
  const counted = kept(rows);
  // Summed in cents, so the total is the customers' revenue to the cent whatever their order.
  return { customers: counted.length, revenue: sum(counted.map((c) => Math.round(c.revenue * 100))) / 100, pastDue: counted.filter((c) => c.status === 'past due') };
}

/** How many names one line carries before it says how many more there are. */
const NAMED = 5;
type Owing = Pick<CustomerRecord, 'name' | 'revenue'>;
const largestFirst = <T extends Owing>(rows: T[]): T[] => [...rows].sort((a, b) => b.revenue - a.revenue);

/** Who is past due, as the assistant reads it: how many, then the largest of them with the revenue each brought. */
export const pastDueFact = (pastDue: Owing[]): string =>
  pastDue.length ? `${pastDue.length}: ${listed(largestFirst(pastDue), (c) => `${c.name} (${formatCost(c.revenue)} revenue)`, 'the Customers list under the status past due has them', NAMED)}` : '0, every invoice is paid';

/** Who is past due, as a tile's one line: the names while there are two or fewer, then the largest two and how many more. */
export function pastDueNote(pastDue: Owing[]): string {
  const names = largestFirst(pastDue).map((c) => c.name);
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ') || 'Every invoice is paid';
}

export function customersAddress(f: CustomersState): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.plan !== 'all') p.set('plan', f.plan);
  if (f.status !== 'all') p.set('status', f.status);
  if (f.sort !== 'revenue' || f.dir !== 'desc') { p.set('sort', f.sort); p.set('dir', f.dir); }
  if (f.page !== '1') p.set('page', f.page);
  return `/customers${p.size ? `?${p}` : ''}`;
}

/** The customers the list shows under a status: `all` is every customer that has not left, and one that has is found under its own status. */
export const under = <T extends Pick<CustomerRecord, 'status'>>(rows: T[], status: string): T[] => (status === 'all' ? kept(rows) : rows.filter((c) => c.status === status));

/** The Customers context; `filtered` is the list the filters leave, and the context orders it as the table does. */
export function customersContext(rows: CustomerRow[], filtered: CustomerRow[], f: CustomersState): SharedContext {
  const field = ({ errors: 'errorRate', trend: 'requests' } as Record<string, keyof CustomerRow>)[f.sort] ?? (f.sort as keyof CustomerRow);
  const matching = [...filtered].sort((a, b) => (f.dir === 'desc' ? -1 : 1) * (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0));
  const filters = [f.plan !== 'all' && `plan ${f.plan}`, f.status !== 'all' && `status ${f.status}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  // Every figure and finding is of the customers that have not left; one that has is in the list under its status only.
  const counted = kept(rows);
  const { customers, revenue, pastDue } = customerFigures(rows);
  const M = CUSTOMER_METRICS;
  const facts: Fact[] = [
    { label: M.customers.label, value: String(customers), definition: M.customers.hint },
    { label: M.revenue.label, value: formatCost(revenue), definition: M.revenue.hint },
    { label: M.pastDue.label, value: pastDueFact(pastDue), definition: M.pastDue.hint },
    { label: filters ? 'Matching' : 'Shown', value: `${matching.length} of ${under(rows, f.status).length}${f.status === 'left' ? ' that have left' : ''}, sorted by ${f.sort} ${f.dir === 'desc' ? 'descending' : 'ascending'}: ${listed(matching, (c) => `${c.name} (${c.plan}, ${c.status}, ${formatCompact(c.requests)} requests, ${formatCost(c.revenue)}, error rate ${formatPercent(c.errorRate, 2)})`, 'narrow the filters to see them', NAMED)}` },
  ];

  const insights: Insight[] = [];
  if (counted.length && revenue) {
    const byRevenue = [...counted].sort((a, b) => b.revenue - a.revenue);
    const top3 = sum(byRevenue.slice(0, 3).map((c) => c.revenue)) / revenue;
    insights.push({ text: `Revenue is concentrated: ${byRevenue[0].name} brings ${formatPercent(byRevenue[0].revenue / revenue, 0)} of it, and the top three ${formatPercent(top3, 0)}.` });
  }
  // Who is moving against everyone else: the combined change first, then whoever departs from it by 10 points or more.
  const all = counted[0]?.trend.map((_, d) => sum(counted.map((c) => c.trend[d] ?? 0))) ?? [];
  const overall = week(all);
  if (overall !== null) {
    const apart = counted.map((c) => ({ c, w: week(c.trend) })).filter((x): x is { c: CustomerRow; w: number } => x.w !== null && Math.abs(x.w - overall) >= 0.1).sort((a, b) => Math.abs(b.w - overall) - Math.abs(a.w - overall));
    const pct = (w: number) => `${w >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(w), 0)}`;
    insights.push({
      text: `Combined requests are ${pct(overall)} over the last 7 days against the 7 before.${apart.length ? ` Apart from that: ${listed(apart, ({ c, w }) => `${c.name} ${pct(w)}`, 'the list has each customer\'s 14 days', NAMED)}.` : ' Every customer moved within 10 points of that.'}`,
      evidence: apart.length ? `/requests?q=${encodeURIComponent(apart[0].c.name)}` : undefined,
    });
  }
  // Against a median of none, twice it is nothing, so the customers named are those with any error at all.
  const errMedian = median(counted.map((c) => c.errorRate));
  const failing = counted.filter((c) => c.errorRate > 0 && c.errorRate >= 2 * errMedian).sort((a, b) => b.errorRate - a.errorRate);
  const against = errMedian ? `an error rate at least twice the median customer's ${formatPercent(errMedian, 2)}` : 'errors, where the median customer has none';
  if (failing.length) insights.push({ text: `${failing.length} of ${counted.length} ${failing.length === 1 ? 'has' : 'have'} ${against}: ${listed(failing, (c) => `${c.name} (${formatPercent(c.errorRate, 2)})`, 'sort the list by error rate to see them', NAMED)}.`, evidence: `/requests?q=${encodeURIComponent(failing[0].name)}&status=5xx` });
  const unknowns = ['A customer\'s error rate counts their 5xx and 429 responses; nothing here says whether the errors were theirs or ours.'];
  const left = rows.length - counted.length;
  if (left) unknowns.push(`${left} ${left === 1 ? 'customer has' : 'customers have'} left and ${left === 1 ? 'is' : 'are'} counted in no figure here; the list shows ${left === 1 ? 'it' : 'them'} under the status left (${customersAddress({ ...f, q: '', plan: 'all', status: 'left', page: '1' })}).`);
  if (!counted.length) unknowns.unshift('There are no customers yet.');

  return { view: 'customers', title: 'Customers', address: customersAddress(f), scope: filters ? `customers with ${filters}` : 'every customer that has not left, revenue over the last 30 days, trend over the last 14', facts, insights, unknowns };
}

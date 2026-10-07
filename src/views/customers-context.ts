/**
 * Customers' shared context (decision 0011): who the customers are, where the spend sits, who is moving and who has
 * not paid, as both agents read it. The columns the table drops on a narrow screen are still the person's to read.
 */
import type { CustomerRecord } from '@/data/sample';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { median } from '@/lib/insight';
import { listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

export type CustomersState = { q: string; plan: string; status: string; sort: string; dir: string; page: string };

/** The tiles' definitions: the info buttons show them and the agents read them. */
export const CUSTOMER_METRICS = {
  customers: { label: 'Customers', hint: 'Workspaces with at least one live key. The line is their combined requests over the last 14 days.' },
  spend: { label: 'Spend, last 30 days', hint: 'Metered usage across every customer, before credits. The line shows the last 14 days.' },
  pastDue: { label: 'Past due', hint: 'Customers whose latest invoice is overdue.' },
} as const;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** The last seven days of a 14-day trend against the seven before: the change a sparkline shows and a list does not say. */
const week = (t: number[]) => (t.length >= 14 && sum(t.slice(0, 7)) ? sum(t.slice(7)) / sum(t.slice(0, 7)) - 1 : null);

export function customersAddress(f: CustomersState): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.plan !== 'all') p.set('plan', f.plan);
  if (f.status !== 'all') p.set('status', f.status);
  if (f.sort !== 'spend' || f.dir !== 'desc') { p.set('sort', f.sort); p.set('dir', f.dir); }
  if (f.page !== '1') p.set('page', f.page);
  return `/customers${p.size ? `?${p}` : ''}`;
}

/** The Customers context; `matching` is the filtered list in the table's order. */
export function customersContext(rows: CustomerRecord[], filtered: CustomerRecord[], f: CustomersState): SharedContext {
  const field = ({ errors: 'errorRate', trend: 'requests' } as Record<string, keyof CustomerRecord>)[f.sort] ?? (f.sort as keyof CustomerRecord);
  const matching = [...filtered].sort((a, b) => (f.dir === 'desc' ? -1 : 1) * (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0));
  const filters = [f.plan !== 'all' && `plan ${f.plan}`, f.status !== 'all' && `status ${f.status}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  const spend = sum(rows.map((c) => c.spend));
  const pastDue = rows.filter((c) => c.status === 'past due');
  const M = CUSTOMER_METRICS;
  const facts: Fact[] = [
    { label: M.customers.label, value: String(rows.length), definition: M.customers.hint },
    { label: M.spend.label, value: formatCost(spend), definition: M.spend.hint },
    { label: M.pastDue.label, value: pastDue.length ? `${pastDue.length}: ${pastDue.map((c) => `${c.name} (${formatCost(c.spend)} spend)`).join(', ')}` : '0, every invoice is paid', definition: M.pastDue.hint },
    { label: filters ? 'Matching' : 'Shown', value: `${matching.length} of ${rows.length}, sorted by ${f.sort} ${f.dir === 'desc' ? 'descending' : 'ascending'}: ${listed(matching, (c) => `${c.name} (${c.plan}, ${c.status}, ${formatCompact(c.requests)} requests, ${formatCost(c.spend)}, error rate ${formatPercent(c.errorRate, 2)})`, 'narrow the filters to see them')}` },
  ];

  const insights: Insight[] = [];
  if (rows.length && spend) {
    const bySpend = [...rows].sort((a, b) => b.spend - a.spend);
    const top3 = sum(bySpend.slice(0, 3).map((c) => c.spend)) / spend;
    insights.push({ text: `Spend is concentrated: ${bySpend[0].name} brings ${formatPercent(bySpend[0].spend / spend, 0)} of it, and the top three ${formatPercent(top3, 0)}.` });
  }
  // Who is moving against everyone else: the combined change first, then whoever departs from it by 10 points or more.
  const all = rows[0]?.trend.map((_, d) => sum(rows.map((c) => c.trend[d] ?? 0))) ?? [];
  const overall = week(all);
  if (overall !== null) {
    const apart = rows.map((c) => ({ c, w: week(c.trend) })).filter((x): x is { c: CustomerRecord; w: number } => x.w !== null && Math.abs(x.w - overall) >= 0.1).sort((a, b) => b.w - a.w);
    const pct = (w: number) => `${w >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(w), 0)}`;
    insights.push({
      text: `Combined requests are ${pct(overall)} over the last 7 days against the 7 before.${apart.length ? ` Apart from that: ${apart.map(({ c, w }) => `${c.name} ${pct(w)}`).join(', ')}.` : ' Every customer moved within 10 points of that.'}`,
      evidence: apart.length ? `/requests?q=${encodeURIComponent(apart[0].c.name)}` : undefined,
    });
  }
  const errMedian = median(rows.map((c) => c.errorRate));
  const failing = rows.filter((c) => c.errorRate >= 2 * errMedian).sort((a, b) => b.errorRate - a.errorRate);
  if (failing.length) insights.push({ text: `${failing.map((c) => `${c.name} (${formatPercent(c.errorRate, 2)})`).join(', ')} ${failing.length === 1 ? 'has' : 'have'} an error rate at least twice the median customer's ${formatPercent(errMedian, 2)}.`, evidence: `/requests?q=${encodeURIComponent(failing[0].name)}&status=5xx` });
  const unknowns = ['A customer\'s error rate counts their 5xx and 429 responses; nothing here says whether the errors were theirs or ours.'];
  if (!rows.length) unknowns.unshift('There are no customers yet.');

  return { view: 'customers', title: 'Customers', address: customersAddress(f), scope: filters ? `customers with ${filters}` : 'every customer, spend over the last 30 days, trend over the last 14', facts, insights, unknowns };
}

/**
 * One customer's shared context (decision 0011): who it is, what it asks of the product and how its last 14 days moved,
 * as both agents read it. It reads one row of the customers; where the customer stands among the others is on Customers.
 */
import type { CustomerRecord } from '@/data/sample';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { week } from './customers-context';
import { against, inDays } from './fact-insight';

export type CustomerData = { customer: CustomerRecord; updatedAt: string; now: string };

export const customerAddress = (id: string) => `/customers/${id}`;

/** The days a customer's figures cover: what it paid and sent is of the last 30 complete days. */
const CUSTOMER_DAYS = 30;

/**
 * One customer's title, from plain figures. What needs somebody comes first: a customer past due says so, then how its
 * week is moving. One on a trial says when the trial ends, and one that has left says when. Any other says what it
 * paid in the period and how its week is moving. `week` is this week's requests over last week's, less one, or null
 * when there is no week to compare, and the clause is then left out.
 */
export function customerTitle({ name, status, revenue, days, week: change, trialEnds, left }: { name: string; status: CustomerRecord['status']; revenue: number; days: number; week: number | null; trialEnds: string | null; left: string | null }): string {
  if (status === 'left') return left ? `${name} left on ${formatDate(left)}` : `${name} has left`;
  if (status === 'trial') return trialEnds ? `${name} is on a trial that ends on ${formatDate(trialEnds)}` : `${name} is on a trial`;
  const moved = change === null ? null : against(1 + change, 1);
  const sent = !moved ? null : moved.way === 'level' ? 'sent as much this week as last' : `sent ${moved.by} ${moved.way === 'up' ? 'more' : 'less'} this week than last`;
  if (status === 'past due') return `${name} is past due${sent ? `, and ${sent}` : ''}`;
  return `${name} paid ${formatCost(revenue)} in ${inDays(days)}${sent ? ` and ${sent}` : ''}`;
}

/** How a customer's week is moving, as its title takes it: the last 7 days of its trend against the 7 before. One that has left has no week. */
const weekOf = (c: CustomerRecord) => (c.status === 'left' ? null : week(c.trend));

/** The title of a customer's page, from its record: the page is headed by it and the context leads with it. */
export const titleOf = (c: CustomerRecord) => customerTitle({ name: c.name, status: c.status, revenue: c.revenue, days: CUSTOMER_DAYS, week: weekOf(c), trialEnds: c.trialEnds, left: c.left });

export function customerContext({ customer: c, updatedAt, now }: CustomerData): SharedContext {
  const facts: Fact[] = [
    { label: 'Plan and status', value: `${c.plan}, ${c.status}` },
    { label: 'Requests, last 30 days', value: formatCompact(c.requests) },
    { label: 'Revenue, last 30 days', value: formatCost(c.revenue), definition: 'What this customer was billed for metered usage, before credits.' },
    { label: 'Error rate', value: formatPercent(c.errorRate, 2), definition: 'Share of its requests answered with a 5xx or a 429.' },
    { label: 'Region and seats', value: `${c.region}, ${c.seats} seats` },
    { label: 'Customer since', value: formatDate(c.joined) },
  ];
  const change = weekOf(c);
  const evidence = `/requests?q=${encodeURIComponent(c.name)}`;
  // A title that states the week leaves this line to say what a week is; one that does not (a trial) leaves it the change.
  const stated = c.status === 'active' || c.status === 'past due';
  const insights: Insight[] = [
    { text: titleOf(c) },
    ...(change === null ? [] : [stated
      ? { text: 'This week is its requests over the last 7 days, and last week the 7 before.', evidence }
      : { text: `Its requests are ${change >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(change), 0)} over the last 7 days against the 7 before.`, evidence }]),
  ];
  return {
    view: 'customer',
    title: c.name,
    address: customerAddress(c.id),
    scope: 'one customer, revenue over the last 30 days, trend over the last 14',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights,
    unknowns: ['Its error rate counts 5xx and 429 responses; nothing here says whether the errors were theirs or ours. How it compares with the other customers is on Customers (/customers).'],
  };
}

/**
 * One customer's shared context (decision 0011): who it is, what it asks of the product and how its last 14 days moved,
 * as both agents read it. It reads one row of the customers; where the customer stands among the others is on Customers.
 */
import type { CustomerRecord } from '@/data/sample';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { week } from './customers-context';

export type CustomerData = { customer: CustomerRecord; updatedAt: string; now: string };

export const customerAddress = (id: string) => `/customers/${id}`;

export function customerContext({ customer: c, updatedAt, now }: CustomerData): SharedContext {
  const facts: Fact[] = [
    { label: 'Plan and status', value: `${c.plan}, ${c.status}` },
    { label: 'Requests, last 30 days', value: formatCompact(c.requests) },
    { label: 'Spend, last 30 days', value: formatCost(c.spend), definition: 'Metered usage before credits.' },
    { label: 'Error rate', value: formatPercent(c.errorRate, 2), definition: 'Share of its requests answered with a 5xx or a 429.' },
    { label: 'Region and seats', value: `${c.region}, ${c.seats} seats` },
    { label: 'Customer since', value: formatDate(c.since) },
  ];
  const change = week(c.trend);
  const insights: Insight[] = change === null ? [] : [{ text: `Its requests are ${change >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(change), 0)} over the last 7 days against the 7 before.`, evidence: `/requests?q=${encodeURIComponent(c.name)}` }];
  return {
    view: 'customer',
    title: c.name,
    address: customerAddress(c.id),
    scope: 'one customer, spend over the last 30 days, trend over the last 14',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights,
    unknowns: ['Its error rate counts 5xx and 429 responses; nothing here says whether the errors were theirs or ours. How it compares with the other customers is on Customers (/customers).'],
  };
}

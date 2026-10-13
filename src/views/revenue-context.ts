/**
 * Revenue's shared context (decision 0011): the three figures the page leads with, as both agents read them. The body is
 * the thin first form; the figures are the ones the Customers page computes, so the two cannot disagree.
 */
import { formatCost } from '@/lib/format';
import { freshnessOf, type Fact, type SharedContext } from '@/lib/shared-context';
import { CUSTOMER_METRICS } from './customers-context';

export type RevenueData = { customers: number; revenue: number; pastDue: { name: string; revenue: number }[]; updatedAt: string; now: string };

export function revenueContext({ customers, revenue, pastDue, updatedAt, now }: RevenueData): SharedContext {
  const M = CUSTOMER_METRICS;
  const facts: Fact[] = [
    { label: M.customers.label, value: String(customers), definition: M.customers.hint },
    { label: M.revenue.label, value: formatCost(revenue), definition: M.revenue.hint },
    { label: M.pastDue.label, value: pastDue.length ? `${pastDue.length}: ${pastDue.map((c) => `${c.name} (${formatCost(c.revenue)} revenue)`).join(', ')}` : '0, every invoice is paid', definition: M.pastDue.hint },
  ];
  return {
    view: 'revenue',
    title: 'Revenue',
    address: '/business',
    scope: 'every customer, revenue over the last 30 days',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights: [],
    unknowns: [...(customers ? [] : ['There are no customers yet.']), 'This page holds three figures; who the customers are, their plans and their trends are on Customers (/customers).'],
  };
}

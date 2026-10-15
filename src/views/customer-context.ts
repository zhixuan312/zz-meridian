/**
 * One customer's shared context (decision 0011): who it is, what it asks of the product and how its last 14 days moved,
 * as both agents read it. It reads one row of the customers, the product's own figures over the same 30 days and the
 * customer's latest requests in the sampled log; where the customer stands among the others is on Customers.
 */
import type { LoggedRequest } from '@/data/requests';
import type { CustomerRecord } from '@/data/sample';
import { formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { week } from './customers-context';
import { against, inDays } from './fact-insight';

export type CustomerData = {
  customer: CustomerRecord;
  /**
   * The product's revenue and error rate over the same 30 complete days, what the customer's share and its error rate
   * are read against. Null when the days could not be read; left out for a person who may not read them.
   */
  product?: { revenue: number; errorRate: number } | null;
  /** Its newest requests in the sampled log, newest first. Null when the log could not be read; left out for a person who may not read it. */
  latest?: LoggedRequest[] | null;
  updatedAt: string;
  now: string;
};

export const customerAddress = (id: string) => `/customers/${id}`;

/** All of a customer's requests in the sampled log: the log filtered to its name. */
export const requestsOf = (name: string) => `/requests?q=${encodeURIComponent(name)}`;

/** The days a customer's figures cover: what it paid and sent is of the last 30 complete days. */
const CUSTOMER_DAYS = 30;
/** How many of its requests in the sampled log its page shows, newest first. */
export const LATEST = 5;

const DAY = 86_400_000;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

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
export const weekOf = (c: CustomerRecord) => (c.status === 'left' ? null : week(c.trend));

/** The title of a customer's page, from its record: the page is headed by it and the context leads with it. */
export const titleOf = (c: CustomerRecord) => customerTitle({ name: c.name, status: c.status, revenue: c.revenue, days: CUSTOMER_DAYS, week: weekOf(c), trialEnds: c.trialEnds, left: c.left });

/** Where it stands and since when: "Past due since 01 Sept 2026", "On a trial that ends on 23 Oct 2026", "Active since 06 Apr 2024", "Left on 24 Nov 2025". */
export function standingOf(c: Pick<CustomerRecord, 'status' | 'joined' | 'trialEnds' | 'pastDueSince' | 'left'>): string {
  if (c.status === 'past due') return c.pastDueSince ? `Past due since ${formatDate(c.pastDueSince)}` : 'Past due';
  if (c.status === 'trial') return c.trialEnds ? `On a trial that ends on ${formatDate(c.trialEnds)}` : 'On a trial';
  if (c.status === 'left') return c.left ? `Left on ${formatDate(c.left)}` : 'Left';
  return `Active since ${formatDate(c.joined)}`;
}

/** Its share of the product's revenue over the same 30 complete days, or null when the product's could not be read or was nothing. */
export const shareOf = ({ customer, product }: Pick<CustomerData, 'customer' | 'product'>) => (product?.revenue ? customer.revenue / product.revenue : null);

/** Its requests over the last 7 complete days, or null when its trend does not hold two weeks. */
export const thisWeekOf = (c: CustomerRecord) => (c.trend.length >= 14 ? sum(c.trend.slice(-7)) : null);

/**
 * The busiest of its 14 days, with its date: the trend is the 14 complete days that end yesterday, so its last value
 * is the day before `now`. Null when it holds no request.
 */
export function busiestOf(c: CustomerRecord, now: string): { date: string; requests: number } | null {
  if (!c.trend.some((n) => n > 0)) return null;
  const at = c.trend.reduce((m, n, i) => (n > c.trend[m] ? i : m), 0);
  const yesterday = Date.parse(`${now.slice(0, 10)}T00:00:00Z`) - DAY;
  return { date: new Date(yesterday - (c.trend.length - 1 - at) * DAY).toISOString().slice(0, 10), requests: c.trend[at] };
}

/** Its requests by endpoint over the 30 days, the largest first, leaving out the endpoints it never called. */
export const endpointsOf = (c: CustomerRecord) => Object.entries(c.byEndpoint).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

/** The endpoints a context names before it counts the rest. */
const NAMED_ENDPOINTS = 3;

export function customerContext(data: CustomerData): SharedContext {
  const { customer: c, product, latest, updatedAt, now } = data;
  const share = shareOf(data);
  const busiest = busiestOf(c, now);
  const endpoints = endpointsOf(c);
  const evidence = requestsOf(c.name);
  const facts: Fact[] = [
    { label: 'Plan and status', value: `${c.plan}, ${standingOf(c).replace(/^./, (s) => s.toLowerCase())}` },
    { label: 'Owner on our side', value: c.owner },
    { label: 'Requests, last 30 days', value: formatCompact(c.requests) },
    {
      label: 'Revenue, last 30 days',
      value: share === null ? formatCost(c.revenue) : `${formatCost(c.revenue)}, ${formatPercent(share, 1)} of the product's revenue over the same days`,
      definition: 'What this customer was billed for metered usage, before credits.',
    },
    ...(busiest ? [{ label: 'Busiest of its last 14 days', value: `${formatDate(busiest.date)}, ${formatCompact(busiest.requests)} requests` }] : []),
    {
      label: 'Error rate, last 30 days',
      value: product ? `${formatPercent(c.errorRate, 2)}, against the product's ${formatPercent(product.errorRate, 2)}` : formatPercent(c.errorRate, 2),
      definition: 'Share of its requests answered with a 5xx or a 429.',
    },
    ...(endpoints.length ? [{
      label: 'What it asks for, last 30 days',
      value: endpoints.slice(0, NAMED_ENDPOINTS).map(([route, n]) => `${route} ${formatPercent(n / c.requests, 0)}`).join(', ') + (endpoints.length > NAMED_ENDPOINTS ? `, and ${endpoints.length - NAMED_ENDPOINTS} more` : ''),
    }] : []),
    { label: 'Region and seats', value: `${c.region}, ${c.seats} seats` },
    { label: 'Customer since', value: formatDate(c.joined) },
    ...(latest ? [{ label: 'Its latest requests in the sampled log', value: latest.length ? `${latest.map((r) => r.id).join(', ')}, newest first: the latest ${latest.length} only, where the log holds more; explore_customer counts them all by status class` : 'none' }] : []),
  ];
  const change = weekOf(c);
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
    scope: 'one customer: what it paid and sent over the last 30 complete days, its trend over the last 14, and its latest requests in the sampled log',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights,
    unknowns: [
      'Its error rate counts 5xx and 429 responses; nothing here says whether the errors were theirs or ours. How it compares with the other customers is on Customers (/customers).',
      ...(product === null ? ["The product's revenue and error rate could not be read, so its share and the product's error rate are not stated."] : []),
      ...(latest === null ? ['The sampled log could not be read, so its latest requests are not stated.'] : []),
    ],
  };
}

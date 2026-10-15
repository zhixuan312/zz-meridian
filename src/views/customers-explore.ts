/**
 * Customers' prepared query (`src/lib/explore.ts`): what an agent on the list may count, group and compare over every
 * customer, by plan, status, region or owner, so "how much do the past due owe" is a figure the collection works out
 * rather than rows an agent adds up. A customer's figures are one each over the last 30 complete days, so the source has
 * no date and no window. Server only: `tools.ts` sets it on the Customers tool.
 */
import type { Condition } from '@/lib/collection';
import type { PreparedQuery, Source } from '@/lib/explore';
import { customerAddress } from './customer-context';
import { customersAddress } from './customers-context';

/** The list filtered as a call was, where the list has the filter: one plan, one status. */
export function customersCallAddress(where: Condition[]): string {
  const one = (field: string) => where.find((w) => w.field === field && w.op === 'eq')?.value;
  const plan = one('plan'), status = one('status');
  return customersAddress({ q: '', plan: typeof plan === 'string' ? plan : 'all', status: typeof status === 'string' ? status : 'all', sort: 'revenue', dir: 'desc', page: '1' });
}

/** The customers as a source: every page that reads them declares the same one. */
export const customersSource: Source = {
  collection: 'customers',
  filters: {
    plan: { ops: ['eq', 'ne', 'in'], values: ['Enterprise', 'Scale', 'Starter'] },
    status: { ops: ['eq', 'ne', 'in'], values: ['active', 'trial', 'past due', 'left'] },
    region: { ops: ['eq', 'ne', 'in'] },
    owner: { ops: ['eq', 'in'] },
  },
  facets: ['plan', 'status', 'region', 'owner'],
  measures: {
    customers: { label: 'Customers', unit: 'customers', definition: 'Customers that have not left.', agg: 'count', where: [{ field: 'status', op: 'ne', value: 'left' }] },
    revenue: { label: 'Revenue, last 30 days', unit: 'USD', definition: 'What they were billed for metered usage over the last 30 complete days, before credits.', agg: 'sum', field: 'revenue' },
    requests: { label: 'Requests, last 30 days', unit: 'requests', definition: 'What they asked of the API over the last 30 complete days.', agg: 'sum', field: 'requests' },
    tokens: { label: 'Tokens, last 30 days', unit: 'tokens', definition: 'Tokens served to them over the last 30 complete days, input and output.', agg: 'sum', field: 'tokens' },
  },
  drill: { columns: ['id', 'name', 'plan', 'status', 'requests', 'revenue', 'owner'], address: (r) => customerAddress(String(r.id)) },
  cannot: 'A customer\'s figures cover the last 30 complete days as one figure each, so no other window and no single day can be said; and one that has left is counted in no figure of customers, revenue or requests.',
};

export const customersExplore: PreparedQuery = {
  sources: { customers: customersSource },
  address: ({ where }) => customersCallAddress(where),
};

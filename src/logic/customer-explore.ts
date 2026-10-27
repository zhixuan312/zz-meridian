/**
 * One customer's prepared query (`src/lib/explore.ts`): what an agent on a customer's page may count and group over
 * that customer alone, its requests in the sampled log and its own row of the customers. `fixed` reads the row by the
 * page's id under the person's rights and holds every call to it, so no other customer is ever read. Server only:
 * `tools.ts` sets it on the Customer tool.
 */
import { read } from '@/data/read';
import type { PreparedQuery } from '@/lib/explore';
import { customerAddress } from './customer-context';
import { requestAddress } from './request-context';

export const customerExplore: PreparedQuery<{ id: string }> = {
  sources: {
    requests: {
      collection: 'requests',
      filters: {
        route: { ops: ['eq', 'ne', 'in'] },
        statusClass: { ops: ['eq', 'ne', 'in'], values: ['2xx', '3xx', '4xx', '5xx'] },
        status: { ops: ['eq', 'lt', 'gt'] },
      },
      facets: ['route', 'statusClass'],
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'Its requests in the sampled log.', agg: 'count' },
        latency: { label: 'p95 latency', unit: 'ms', definition: 'The latency of its sampled requests at the 95th percentile.', agg: 'p95', field: 'latency' },
      },
      drill: { columns: ['id', 'at', 'method', 'route', 'status', 'latency'], address: (r) => requestAddress(String(r.id)) },
      cannot: 'These are its requests in the sampled log, a sample of the latest requests the workspace received, not every request it sent: what it sent over 30 days is in its own figures.',
    },
    customers: {
      collection: 'customers',
      filters: {},
      facets: [],
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'What it asked of the API over the last 30 complete days.', agg: 'sum', field: 'requests' },
        tokens: { label: 'Tokens', unit: 'tokens', definition: 'Tokens served to it over the last 30 complete days, input and output.', agg: 'sum', field: 'tokens' },
        revenue: { label: 'Revenue', unit: 'money', definition: 'What it was billed for metered usage over the last 30 complete days, before credits.', agg: 'sum', field: 'revenue' },
      },
      drill: { columns: ['id', 'name', 'plan', 'status', 'requests', 'revenue'], address: (r) => customerAddress(String(r.id)) },
      cannot: 'Its own row covers the last 30 complete days as one figure each, so no single day of them can be said; how it compares with the others is on Customers (/customers).',
    },
  },
  async fixed({ id }) {
    const { rows } = await read('customers', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
    const name = rows[0]?.name;
    // Thrown before any figure is read: the agent is told there is no such customer, and nothing else.
    if (typeof name !== 'string') throw new Error(`There is no customer with the id ${id}.`);
    return { requests: [{ field: 'customer', op: 'eq', value: name }], customers: [{ field: 'id', op: 'eq', value: id }] };
  },
};

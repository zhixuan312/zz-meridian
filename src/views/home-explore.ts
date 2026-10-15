/**
 * Home's prepared query (`src/lib/explore.ts`): what an agent on the company's page may count, group and compare over
 * the collections the page reads. The days answer revenue, requests and tokens over any window of complete days, and
 * gross margin against what compute cost over the same window; the usage says which model they came from; the
 * customers who pays; the compute where the GPUs ran. What compute cost, and so gross margin, is offered only to a
 * person who may read `costs`: the runner leaves both out of anyone else's schema. Server only: `tools.ts` sets it on
 * the Home tool.
 */
import type { PreparedQuery } from '@/lib/explore';
import { customersCallAddress, customersSource } from './customers-explore';

/** The page pointed at one day: every complete day kept is the period, so any day kept is in it. */
const onDay = (row: Record<string, unknown>) => `/?period=all&day=${String(row.date).slice(0, 10)}`;

export const homeExplore: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'date',
      filters: {},
      facets: [],
      buckets: ['day', 'week', 'month', 'weekday'],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'Billed for metered usage over the complete days, before credits.', agg: 'sum', field: 'revenue' },
        grossMargin: { label: 'Gross margin', unit: 'of revenue', definition: 'Revenue less compute cost, over revenue, as a fraction: 0.5 is 50%.', derive: 'margin', of: ['revenue', 'costs.compute'] },
        requests: { label: 'Requests', unit: 'requests', definition: 'Every call answered, at any status, over the complete days.', agg: 'sum', field: 'requests' },
        tokens: { label: 'Tokens served', unit: 'tokens', definition: 'Input and output, every model, over the complete days.', agg: 'sum', field: 'tokens' },
      },
      drill: { columns: ['date', 'revenue', 'requests', 'tokens'], address: onDay },
      cannot: 'The day in progress is counted in no total, and a day does not say which customer paid for it.',
    },
    usage: {
      collection: 'usage',
      date: 'date',
      filters: { model: { ops: ['eq', 'ne', 'in'] } },
      facets: ['model'],
      buckets: ['day', 'week', 'month'],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'What the model\'s tokens were billed at its price; "none" is the calls that reach no model, at the price of a call.', agg: 'sum', field: 'revenue' },
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests the model answered over the complete days.', agg: 'sum', field: 'requests' },
        outputTokens: { label: 'Output tokens', unit: 'tokens', definition: 'Tokens the model wrote over the complete days.', agg: 'sum', field: 'outputTokens' },
      },
      drill: { columns: ['id', 'date', 'model', 'requests', 'revenue'], address: onDay },
      cannot: 'A row is a day and a model: it does not say who sent the requests.',
    },
    customers: customersSource,
    compute: {
      collection: 'compute',
      date: 'date',
      filters: { region: { ops: ['eq', 'ne', 'in'] } },
      facets: ['region'],
      buckets: ['day', 'week', 'month'],
      measures: {
        used: { label: 'GPU-hours used', unit: 'GPU-hours', definition: 'GPU-hours used over the complete days.', agg: 'sum', field: 'used' },
        gpus: { label: 'GPUs provisioned', unit: 'GPU-days', definition: 'The GPUs provisioned, a day each, over the complete days.', agg: 'sum', field: 'gpus' },
        // used / (gpus × 24 hours), as a percentage: the scale is 24 hours over 100.
        inUse: { label: 'Compute in use', unit: '%', definition: 'GPU-hours used of those provisioned.', derive: 'ratio', of: ['used', 'gpus'], scale: 0.24 },
      },
      drill: { columns: ['id', 'date', 'region', 'gpus', 'used'], address: onDay },
      cannot: 'Compute in use says how full the GPUs were, not what they cost or which model ran on them.',
    },
    costs: {
      collection: 'costs',
      date: 'date',
      filters: {},
      facets: [],
      buckets: ['day', 'week', 'month'],
      measures: {
        compute: { label: 'Compute cost', unit: 'USD', definition: 'What the GPUs provisioned cost over the complete days.', agg: 'sum', field: 'compute' },
      },
      drill: { columns: ['date', 'compute'], address: onDay },
      cannot: 'The day in progress is counted in no total, and compute cost is not kept by region or by model.',
    },
  },
  // The page at the period asked; the customers' figures do not follow it, so a call over them opens the list it asked.
  address: ({ source, where, period }) => (source === 'customers' ? customersCallAddress(where) : period ? `/?period=${period}` : '/'),
};

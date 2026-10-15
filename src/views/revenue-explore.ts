/**
 * Revenue's prepared query (`src/lib/explore.ts`): what an agent on Business's home may count, group and compare over
 * the collections the page reads. The days answer revenue and revenue by plan over any window of complete days, against
 * the window before; the customers who pays, by plan, status, region or owner; the usage what they buy, by model.
 * Server only: `tools.ts` sets it on the Revenue tool.
 */
import type { PreparedQuery } from '@/lib/explore';
import { customersCallAddress, customersSource } from './customers-explore';

const plan = (name: 'Enterprise' | 'Scale' | 'Starter') =>
  ({ label: `${name} revenue`, unit: 'USD', definition: `What customers on ${name} were billed over the complete days, before credits.`, agg: 'sum', field: `revenueByPlan.${name}` }) as const;

export const revenueExplore: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'date',
      filters: {},
      facets: [],
      buckets: ['day', 'week', 'month', 'weekday'],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'Billed for metered usage over the complete days, before credits.', agg: 'sum', field: 'revenue' },
        enterprise: plan('Enterprise'),
        scale: plan('Scale'),
        starter: plan('Starter'),
      },
      // Revenue has no day of its own to point at: every complete day kept is the period whose charts hold the row.
      drill: { columns: ['date', 'revenue', 'revenueByPlan'], address: () => '/business?period=all' },
      cannot: 'The day in progress is counted in no total, and a day says what each plan paid, not which customer. Only a window\'s first and last week or month can be cut short: such a one holds fewer days than its kind, so its total is no movement; every other is whole.',
    },
    customers: customersSource,
    usage: {
      collection: 'usage',
      date: 'date',
      filters: { model: { ops: ['eq', 'ne', 'in'] } },
      facets: ['model'],
      buckets: ['day', 'week', 'month'],
      measures: {
        revenue: { label: 'Revenue', unit: 'USD', definition: 'What the model\'s tokens were billed at its price; "none" is the calls that reach no model, at the price of a call.', agg: 'sum', field: 'revenue' },
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests the model answered over the complete days.', agg: 'sum', field: 'requests' },
      },
      drill: { columns: ['id', 'date', 'model', 'requests', 'revenue'], address: () => '/business?period=all' },
      cannot: 'A row is a day and a model: it does not say which customer or plan paid for it.',
    },
  },
  // The page at the period asked; the customers' figures do not follow it, so a call over them opens the list it asked.
  address: ({ source, where, period }) => (source === 'customers' ? customersCallAddress(where) : period ? `/business?period=${period}` : '/business'),
};

/**
 * Usage's prepared query (`src/lib/explore.ts`): what an agent on the page may count, group and compare over the
 * collections the page reads. The hours answer when requests come, a weekday and an hour at a time, which is how the
 * Sunday 22:00 cell is asked for; the days answer requests a day over any window of complete days; and the usage by
 * model says which model answered them. Server only: `tools.ts` sets it on the Usage tool.
 */
import type { PreparedQuery } from '@/lib/explore';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** The page pointed at one day: every complete day kept is the period, so any day of the calendar is in it. */
const onDay = (row: Record<string, unknown>) => `/usage?period=all&day=${String(row.date).slice(0, 10)}`;

export const usageExplore: PreparedQuery = {
  sources: {
    hours: {
      collection: 'hours',
      filters: { weekday: { ops: ['eq', 'in'], values: WEEKDAYS.map((_, d) => d) }, hour: { ops: ['eq', 'in', 'lt', 'gt'], values: HOURS } },
      facets: ['weekday', 'hour'],
      // The sample keeps a weekday as 0 (Monday) to 6 (Sunday): an answer says it by name, and an hour as the page writes it.
      labels: {
        weekday: Object.fromEntries(WEEKDAYS.map((name, d) => [String(d), name])),
        hour: Object.fromEntries(HOURS.map((h) => [String(h), `${String(h).padStart(2, '0')}:00 UTC`])),
      },
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests in the weekday and UTC hour, summed over the last 30 complete days.', agg: 'sum', field: 'requests' },
      },
      drill: { columns: ['id', 'weekday', 'hour', 'requests'], address: () => '/usage' },
      cannot: 'Requests are not kept by customer and hour, so who sent them cannot be said.',
    },
    days: {
      collection: 'days',
      date: 'date',
      filters: {},
      facets: [],
      buckets: ['day', 'week', 'month', 'weekday'],
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests answered over the complete days.', agg: 'sum', field: 'requests' },
        errors: { label: 'Errors', unit: 'errors', definition: 'Requests answered with a 5xx or a 429.', agg: 'sum', field: 'errors' },
        errorRate: { label: 'Error rate', unit: '%', definition: 'Errors as a share of requests.', derive: 'ratio', of: ['errors', 'requests'], scale: 0.01 },
        p95: { label: 'Highest p95', unit: 'ms', definition: "The highest of the days' p95 latency, not the median day's the page states.", agg: 'max', field: 'p95' },
      },
      drill: { columns: ['date', 'requests', 'errors', 'p95'], address: onDay },
      cannot: 'The day in progress is counted in no total, and a day does not say who sent its requests. Only a window\'s first and last week or month can be cut short: such a one holds fewer days than its kind, so its total is no movement; every other is whole.',
    },
    usage: {
      collection: 'usage',
      date: 'date',
      filters: { model: { ops: ['eq', 'ne', 'in'] } },
      facets: ['model'],
      buckets: ['day', 'week', 'month'],
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests the model answered over the complete days; "none" is the calls that reach no model.', agg: 'sum', field: 'requests' },
        errors: { label: 'Errors', unit: 'errors', definition: 'Requests the model answered with a 5xx or a 429.', agg: 'sum', field: 'errors' },
        errorRate: { label: 'Error rate', unit: '%', definition: 'Errors as a share of requests.', derive: 'ratio', of: ['errors', 'requests'], scale: 0.01 },
      },
      drill: { columns: ['id', 'date', 'model', 'requests', 'errors'], address: onDay },
      cannot: 'A row is a day and a model: it does not say who sent the requests or which endpoint answered them.',
    },
  },
  // The page at the period asked, where the source has one: the days and the usage follow it, the hours do not.
  address: ({ source, period }) => (source !== 'hours' && period ? `/usage?period=${period}` : '/usage'),
};

/**
 * Now's prepared query (`src/lib/explore.ts`): what an agent on the page may count, group and compare over the
 * collections Now reads. The days answer how many were inside the band over any window of complete days, a count over
 * the `inBand` each day carries, so it is the steady fact's number; the usage by model, the compute by region, the
 * tickets and the verification runs answer what the page's other cards show a moment of. Server only: `tools.ts` sets
 * it on the Now tool.
 */
import { REGION_NAMES } from '@/data/sample';
import type { PreparedQuery } from '@/lib/explore';
import { testsAddress } from './tests-context';
import { ticketsAddress } from './tickets-context';

const NOW = '/engineering';

export const nowExplore: PreparedQuery = {
  sources: {
    days: {
      collection: 'days',
      date: 'date',
      filters: { inBand: { ops: ['eq'], values: [true, false] } },
      facets: ['inBand'],
      buckets: ['week', 'month', 'weekday'],
      labels: { inBand: { true: 'inside the band', false: 'outside the band' } },
      measures: {
        inside: { label: 'Days inside the band', unit: 'days', definition: 'Complete days whose p95 and error rate were both under the band.', agg: 'count', where: [{ field: 'inBand', op: 'eq', value: true }] },
        days: { label: 'Days', unit: 'days', definition: 'Complete days, inside the band or not.', agg: 'count' },
        p95: { label: 'Highest p95', unit: 'ms', definition: "The highest of the days' p95 latency, not the median day's the page draws.", agg: 'max', field: 'p95' },
      },
      drill: { columns: ['date', 'inBand', 'p95', 'errors', 'requests'], address: () => NOW },
      cannot: 'The day in progress is counted in no total, and a day does not say which service or model was slow. A week or a month the window cuts holds fewer days than its kind, so its total is no movement: compare whole ones.',
    },
    models: {
      collection: 'usage',
      date: 'date',
      filters: { model: { ops: ['eq', 'ne', 'in'] } },
      facets: ['model'],
      buckets: ['week', 'month'],
      measures: {
        requests: { label: 'Requests', unit: 'requests', definition: 'Requests the model answered; "none" is the calls that reach no model.', agg: 'sum', field: 'requests' },
        errors: { label: 'Errors', unit: 'errors', definition: 'Requests the model answered with a 5xx or a 429.', agg: 'sum', field: 'errors' },
        p95: { label: 'Highest p95', unit: 'ms', definition: "The highest of the model's daily p95 latency, not its median day's the page draws.", agg: 'max', field: 'p95' },
        ttft: { label: 'Highest time to first token', unit: 'ms', definition: "The highest of the model's daily p95 time to the first token; none for a model that writes no tokens.", agg: 'max', field: 'ttft' },
      },
      drill: { columns: ['id', 'date', 'model', 'requests', 'errors', 'p95', 'ttft'], address: () => NOW },
      cannot: 'A row is a day and a model: it does not say which customer or endpoint the requests came from.',
    },
    compute: {
      collection: 'compute',
      date: 'date',
      filters: { region: { ops: ['eq', 'ne', 'in'], values: REGION_NAMES } },
      facets: ['region'],
      measures: {
        used: { label: 'GPU-hours used', unit: 'GPU-hours', definition: 'GPU-hours used over the complete days.', agg: 'sum', field: 'used' },
        gpus: { label: 'GPU-days provisioned', unit: 'GPU-days', definition: 'The GPUs provisioned, summed over the days.', agg: 'sum', field: 'gpus' },
        inUse: { label: 'Compute in use', unit: '%', definition: 'GPU-hours used as a share of the GPU-hours provisioned, 24 a GPU a day.', derive: 'ratio', of: ['used', 'gpus'], scale: 0.24 },
      },
      drill: { columns: ['id', 'date', 'region', 'gpus', 'used'], address: () => NOW },
      cannot: 'Compute is kept a day and a region at a time, not by model or by customer, and its cost is not here.',
    },
    tickets: {
      collection: 'tickets',
      date: 'openedAt',
      filters: {
        state: { ops: ['eq', 'ne', 'in'], values: ['open', 'waiting', 'closed'] },
        priority: { ops: ['eq', 'ne', 'in'], values: ['low', 'normal', 'high'] },
        service: { ops: ['eq', 'in'] },
      },
      facets: ['state', 'priority', 'service'],
      measures: {
        tickets: { label: 'Tickets opened', unit: 'tickets', definition: 'Tickets opened in the window, whatever their state now.', agg: 'count' },
        closed: { label: 'Closed now', unit: 'tickets', definition: 'Tickets opened in the window that are closed now.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'closed' }] },
      },
      drill: { columns: ['id', 'title', 'state', 'priority', 'service', 'assigneeId', 'openedAt', 'closedAt'], address: (r) => ticketsAddress({ q: String(r.title), state: 'all', priority: 'all' }) },
      cannot: 'Tickets are windowed by when they were opened, so a ticket opened before the window and closed in it is not counted.',
    },
    runs: {
      collection: 'tests',
      date: 'startedAt',
      filters: { state: { ops: ['eq', 'ne', 'in'], values: ['passed', 'failed', 'skipped'] }, suite: { ops: ['eq', 'in'] } },
      facets: ['state', 'suite'],
      buckets: ['day', 'week'],
      measures: {
        runs: { label: 'Runs', unit: 'runs', definition: 'Verification runs that started in the window, however they ended.', agg: 'count' },
        passed: { label: 'Passed', unit: 'runs', definition: 'Runs that started in the window and passed.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'passed' }] },
      },
      drill: { columns: ['id', 'suite', 'endpointId', 'releaseId', 'state', 'startedAt'], address: (r) => testsAddress({ q: '', state: 'all', release: String(r.releaseId) }) },
      cannot: 'The runs are recorded outside this product: nothing here reruns a verification.',
    },
  },
};

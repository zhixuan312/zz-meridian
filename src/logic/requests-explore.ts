/**
 * The request log's prepared query (`src/lib/explore.ts`): what an agent on Requests may count and group over the
 * sampled log, by status class, route, customer, region, method or model. The log is a sample of the latest requests
 * the workspace received, so the source has no date and no window, and every answer says it is of the sample. Server
 * only: `tools.ts` sets it on the Requests tool.
 */
import type { Condition } from '@/lib/collection';
import type { PreparedQuery, Source } from '@/lib/explore';
import { requestsAddress } from './requests-context';

/** The statuses an error rate counts: every 5xx and the 429 of a limit, as the page's "Errors and limits" does. */
const ERRORS = [429, ...Array.from({ length: 12 }, (_, i) => 500 + i)];

/** The sampled log as a source: the list declares it whole, and One request holds it to one route. */
export const requestsSource: Source = {
  collection: 'requests',
  filters: {
    statusClass: { ops: ['eq', 'ne', 'in'], values: ['2xx', '3xx', '4xx', '5xx'] },
    status: { ops: ['eq', 'in', 'lt', 'gt'] },
    route: { ops: ['eq', 'ne', 'in'] },
    method: { ops: ['eq', 'in'] },
    customer: { ops: ['eq', 'ne', 'in'] },
    region: { ops: ['eq', 'ne', 'in'] },
    model: { ops: ['eq', 'ne', 'in'] },
  },
  facets: ['statusClass', 'route', 'customer', 'region', 'model'],
  none: { model: 'no model' },
  measures: {
    requests: { label: 'Requests', unit: 'requests', definition: 'Requests in the sampled log.', agg: 'count' },
    errors: { label: 'Errors and limits', unit: 'requests', definition: 'Requests in the sampled log answered with a 5xx or a 429.', agg: 'count', where: [{ field: 'status', op: 'in', value: ERRORS }] },
    errorRate: { label: 'Error rate', unit: '%', definition: 'Errors and limits as a share of the requests.', derive: 'ratio', of: ['errors', 'requests'], scale: 0.01 },
    latency: { label: 'Latency p95', unit: 'ms', definition: '95 of every 100 sampled requests finished faster than this.', agg: 'p95', field: 'latency' },
  },
  drill: { columns: ['id', 'at', 'method', 'route', 'status', 'latency', 'customer'], address: (r) => `/requests/${String(r.id)}` },
  cannot: 'These are the requests in the sampled log, a sample of the latest requests the workspace received, not every request: how many came in a day is on Usage (/usage).',
};

/** The log filtered as a call was, where the log has the filter: a status class, a method, a region, or text. */
function callAddress(where: Condition[]): string {
  const one = (field: string) => {
    const v = where.find((w) => w.field === field && w.op === 'eq')?.value;
    return typeof v === 'string' ? v : undefined;
  };
  return requestsAddress({ q: one('customer') ?? one('route') ?? '', status: one('statusClass') ?? 'all', method: one('method') ?? 'all', region: one('region') ?? 'all', sort: 'at', dir: 'desc', page: 1 });
}

export const requestsExplore: PreparedQuery = {
  sources: { requests: requestsSource },
  address: ({ where }) => callAddress(where),
};

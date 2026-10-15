/**
 * Tests' prepared query (`src/lib/explore.ts`): what an agent on the page may count, group and compare over the
 * verification runs, windowed by when each started, so "how many passed in the last seven days" is a figure the
 * collection works out rather than rows an agent counts. Server only: `tools.ts` sets it on the Tests tool.
 */
import type { PreparedQuery } from '@/lib/explore';
import { testsAddress } from './tests-context';

const all = { q: '', state: 'all', release: '' };

export const testsExplore: PreparedQuery = {
  sources: {
    runs: {
      collection: 'tests',
      date: 'startedAt',
      filters: {
        state: { ops: ['eq', 'ne', 'in'], values: ['passed', 'failed', 'skipped'] },
        suite: { ops: ['eq', 'in'] },
        endpointId: { ops: ['eq', 'in'] },
        releaseId: { ops: ['eq', 'in'] },
      },
      facets: ['state', 'suite', 'endpointId', 'releaseId'],
      buckets: ['day', 'week'],
      measures: {
        runs: { label: 'Runs', unit: 'runs', definition: 'Every run that started in the window, however it ended, earlier runs of a verification among them.', agg: 'count' },
        failed: { label: 'Failed', unit: 'runs', definition: 'Runs that started in the window and failed.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'failed' }] },
        duration: { label: 'p95 duration', unit: 'ms', definition: 'How long a run took, at the 95th percentile.', agg: 'p95', field: 'durationMs' },
      },
      // A run has no page of its own: its release's runs are the page that lists it.
      drill: { columns: ['id', 'suite', 'endpointId', 'releaseId', 'state', 'startedAt', 'failure'], address: (r) => testsAddress({ ...all, release: String(r.releaseId) }) },
      cannot: 'The page only shows what ran: nothing here reruns a verification, and the runs are recorded outside this product. A window holds complete days, so a run that started today is in none.',
    },
  },
  // The page filtered as the call was, where the page has the filter: one verdict, or one release.
  address: ({ where }) => {
    const one = (field: string) => where.find((w) => w.field === field && w.op === 'eq')?.value;
    const state = one('state'), release = one('releaseId');
    return testsAddress({ ...all, ...(typeof state === 'string' ? { state } : {}), ...(typeof release === 'string' ? { release } : {}) });
  },
};

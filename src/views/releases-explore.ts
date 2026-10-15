/**
 * Releases' prepared query (`src/lib/explore.ts`): what an agent on the page may count and group over the releases,
 * windowed by when each last changed (for one that went out, when it went out), and over the verification runs that
 * hold them, windowed by when each started, so "which release failed the most runs this month" is a figure rather than
 * runs an agent counts. Server only: `tools.ts` sets it on the Releases tool.
 */
import type { PreparedQuery } from '@/lib/explore';
import { releasesAddress } from './releases-context';
import { testsAddress } from './tests-context';

export const releasesExplore: PreparedQuery = {
  sources: {
    releases: {
      collection: 'releases',
      date: 'updatedAt',
      filters: {
        state: { ops: ['eq', 'ne', 'in'], values: ['testing', 'pending', 'released'] },
        environment: { ops: ['eq', 'in'], values: ['staging', 'production'] },
        service: { ops: ['eq', 'ne', 'in'] },
      },
      facets: ['state', 'environment', 'service'],
      buckets: ['week', 'month'],
      measures: {
        releases: { label: 'Releases', unit: 'releases', definition: 'Releases that last changed in the window, or went out in it.', agg: 'count' },
        released: { label: 'Went out', unit: 'releases', definition: 'Releases that went out in the window.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'released' }] },
      },
      // A release opens on the page searched for its version, which is how the page finds one release.
      drill: { columns: ['id', 'version', 'service', 'environment', 'state', 'commit', 'updatedAt', 'releasedAt'], address: (r) => releasesAddress({ q: String(r.version), state: 'all', environment: 'all' }) },
      cannot: 'A release\'s state is the record\'s: pending is what the page calls Ready to release. A window holds complete days, so a release that changed today is in none, and which live version each service runs is on the page itself.',
    },
    runs: {
      collection: 'tests',
      date: 'startedAt',
      filters: {
        state: { ops: ['eq', 'ne', 'in'], values: ['passed', 'failed', 'skipped'] },
        releaseId: { ops: ['eq', 'in'] },
        suite: { ops: ['eq', 'in'] },
        endpointId: { ops: ['eq', 'in'] },
      },
      facets: ['releaseId', 'state', 'suite', 'endpointId'],
      buckets: ['day', 'week'],
      measures: {
        runs: { label: 'Runs', unit: 'runs', definition: 'Verification runs that started in the window, earlier runs of a verification among them.', agg: 'count' },
        failed: { label: 'Failed', unit: 'runs', definition: 'Runs that started in the window and failed.', agg: 'count', where: [{ field: 'state', op: 'eq', value: 'failed' }] },
      },
      drill: { columns: ['id', 'releaseId', 'suite', 'endpointId', 'state', 'startedAt', 'failure'], address: (r) => testsAddress({ q: '', state: 'all', release: String(r.releaseId) }) },
      cannot: 'A count of runs is not what holds a release: only the latest run of each required verification does, which the page states as In testing.',
    },
  },
  // The page filtered as the call was, where the page has the filter: one environment.
  address: ({ source, where }) => {
    const environment = source === 'releases' ? where.find((w) => w.field === 'environment' && w.op === 'eq')?.value : undefined;
    return releasesAddress({ q: '', state: 'all', environment: typeof environment === 'string' ? environment : 'all' });
  },
};

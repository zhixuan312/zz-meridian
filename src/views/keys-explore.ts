/**
 * API keys' prepared query (`src/lib/explore.ts`): what an agent on the page may count and group over the workspace's
 * keys, by environment and owner. A key's secret is in no filter, facet, measure or drill: it is shown once, on this
 * page, and its hash is `hidden` on the collection besides. Server only: `tools.ts` sets it on the API keys tool.
 */
import type { PreparedQuery } from '@/lib/explore';

export const keysExplore: PreparedQuery = {
  sources: {
    keys: {
      collection: 'keys',
      filters: {
        env: { ops: ['eq', 'in'], values: ['live', 'test'] },
        owner: { ops: ['eq', 'ne', 'in'] },
        lastUsed: { ops: ['lt', 'gt'] },
        created: { ops: ['lt', 'gt'] },
      },
      facets: ['env', 'owner'],
      measures: {
        keys: { label: 'Keys', unit: 'keys', definition: 'API keys, live and test unless narrowed by env.', agg: 'count' },
        live: { label: 'Live keys', unit: 'keys', definition: 'Keys whose env is live: they reach production.', agg: 'count', where: [{ field: 'env', op: 'eq', value: 'live' }] },
      },
      drill: { columns: ['id', 'name', 'env', 'hint', 'owner', 'scopes', 'created', 'lastUsed'], address: () => '/keys' },
      cannot: 'A key\'s secret is never read here: the hint is its first and last characters. Last used and created are times that lt and gt compare with a date such as 2026-09-01; a key never used has none, so lt and gt both leave it out. Creating a key is the person\'s to do on this page.',
    },
  },
};

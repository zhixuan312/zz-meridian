/**
 * One request's prepared query (`src/lib/explore.ts`): what an agent on a request's page may count and group over the
 * sampled requests to the same route, so "is this route slow or failing in general" is a figure rather than one sample.
 * `fixed` reads the request by the page's id under the person's rights and holds every call to its route. Server only:
 * `tools.ts` sets it on the Request tool.
 */
import { read } from '@/data/read';
import type { PreparedQuery } from '@/lib/explore';
import { requestsSource } from './requests-explore';

const { route: _, ...filters } = requestsSource.filters;

export const requestExplore: PreparedQuery<{ id: string }> = {
  sources: {
    requests: {
      ...requestsSource,
      // The route is the page's: a call cannot narrow or group by another.
      filters,
      facets: requestsSource.facets.filter((f) => f !== 'route'),
      cannot: 'These are the requests to its route in the sampled log, a sample of the latest requests the workspace received, not every request to it: every route\'s last 30 days is on Now\'s Slowest endpoints (/engineering).',
    },
  },
  async fixed({ id }) {
    const { rows } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }], limit: 1 });
    const route = rows[0]?.route;
    // Thrown before any figure is read: the agent is told there is no such request, and nothing else.
    if (typeof route !== 'string') throw new Error(`There is no request with the id ${id}.`);
    return { requests: [{ field: 'route', op: 'eq', value: route }] };
  },
};

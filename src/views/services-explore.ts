/**
 * Services' prepared query (`src/lib/explore.ts`): what an agent on the page may count and group over the monitored
 * services and their incidents. A service's uptime is read as the percentage the collection derives (`uptimePercent`),
 * so the average is the uptime over 90 days the title states, with two decimals to say it in. Neither source has a
 * date: a service keeps its last 90 days as one figure, and the incidents are read whole, in the order they are kept,
 * the latest started first. Server only: `tools.ts` sets it on the Services tool.
 */
import type { PreparedQuery } from '@/lib/explore';

const STATES = ['operational', 'degraded', 'outage'];

export const servicesExplore: PreparedQuery = {
  sources: {
    services: {
      collection: 'services',
      filters: { status: { ops: ['eq', 'ne', 'in'], values: STATES } },
      facets: ['status'],
      measures: {
        uptime: { label: 'Uptime, 90 days', unit: '%', definition: "The average of each service's uptime over its last 90 days, the figure the title states; a degraded day costs half an hour of it and a day of outage two hours.", agg: 'avg', field: 'uptimePercent' },
        lowest: { label: 'Lowest uptime', unit: '%', definition: 'The lowest uptime of one service over its last 90 days.', agg: 'min', field: 'uptimePercent' },
        services: { label: 'Services', unit: 'services', definition: 'Monitored services, in the state they are in now.', agg: 'count' },
        latency: { label: 'Highest latency now', unit: 'ms', definition: 'The highest latency of a service at this moment.', agg: 'max', field: 'latency' },
      },
      // No date, so the drill reads the services in the collection's order: the team's, the gateway first.
      drill: { columns: ['name', 'status', 'uptimePercent', 'latency'], address: () => '/services' },
      cannot: 'A service keeps its last 90 days as one uptime and a mark a day, so its uptime over any other window, or on one day, cannot be said.',
    },
    incidents: {
      collection: 'incidents',
      filters: {
        state: { ops: ['eq', 'ne', 'in'], values: ['investigating', 'monitoring', 'resolved'] },
        severity: { ops: ['eq', 'in'], values: ['minor', 'major'] },
        service: { ops: ['eq', 'in'] },
      },
      facets: ['state', 'severity', 'service'],
      measures: {
        incidents: { label: 'Incidents', unit: 'incidents', definition: 'Incidents kept, open and resolved, unless narrowed by state.', agg: 'count' },
        open: { label: 'Open', unit: 'incidents', definition: 'Incidents nobody has resolved yet.', agg: 'count', where: [{ field: 'state', op: 'ne', value: 'resolved' }] },
      },
      drill: { columns: ['id', 'title', 'service', 'severity', 'state', 'started', 'resolved', 'owner'], address: () => '/services' },
      cannot: 'Incidents have no window: every incident kept is counted, and its rows come newest started first. What one cost customers is not recorded.',
    },
  },
};

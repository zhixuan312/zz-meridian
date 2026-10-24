/**
 * Tickets' prepared query (`src/lib/explore.ts`): what an agent on the page may count and group over the tickets, once
 * by when each was opened and once by when it was closed, so "how many were opened this week" and "how many were closed
 * in the last 30 days" are each a figure the collection works out over its own date. Server only: `tools.ts` sets it
 * on the Tickets tool.
 */
import type { PreparedQuery, Source } from '@/lib/explore';
import { ticketsAddress } from './tickets-context';

const filters: Source['filters'] = {
  state: { ops: ['eq', 'ne', 'in'], values: ['open', 'waiting', 'closed'] },
  priority: { ops: ['eq', 'ne', 'in'], values: ['low', 'normal', 'high'] },
  service: { ops: ['eq', 'ne', 'in'] },
  assigneeId: { ops: ['eq', 'ne', 'in'] },
};
const facets = ['state', 'priority', 'service', 'assigneeId'];
/** A ticket nobody has reads as the page says it. */
const none = { assigneeId: 'unassigned' };
/** A ticket opens on the page searched for its title, which is how the page finds one ticket. */
const drill: Source['drill'] = {
  columns: ['id', 'title', 'state', 'priority', 'service', 'assigneeId', 'openedAt', 'closedAt', 'incidentId'],
  address: (r) => ticketsAddress({ q: String(r.title), state: 'all', priority: 'all' }),
};

export const ticketsExplore: PreparedQuery = {
  sources: {
    opened: {
      collection: 'tickets',
      date: 'openedAt',
      filters,
      facets,
      none,
      buckets: ['day', 'week', 'month'],
      measures: {
        tickets: { label: 'Tickets opened', unit: 'tickets', definition: 'Tickets opened in the window, whatever their state now.', agg: 'count' },
        inPlay: { label: 'Still in play', unit: 'tickets', definition: 'Tickets opened in the window that are open or waiting now.', agg: 'count', where: [{ field: 'state', op: 'ne', value: 'closed' }] },
      },
      drill,
      cannot: 'A window holds complete days, so a ticket opened today is in none: the page counts it. A ticket keeps its state now, not its history, so when it was waiting, or who had it before, cannot be said; its assignee is a member id, and the page names the member each ticket is assigned to.',
    },
    closed: {
      collection: 'tickets',
      date: 'closedAt',
      filters,
      facets,
      none,
      buckets: ['day', 'week', 'month'],
      measures: {
        tickets: { label: 'Tickets closed', unit: 'tickets', definition: 'Tickets closed in the window, wherever they were opened.', agg: 'count' },
      },
      drill,
      cannot: 'Only closed tickets have a closing date, so this source counts none in play; how long each took is from its openedAt and closedAt.',
    },
  },
  // The page filtered as the call was, where the page has the filter: one state, or one priority.
  address: ({ where }) => {
    const one = (field: string) => where.find((w) => w.field === field && w.op === 'eq')?.value;
    const state = one('state'), priority = one('priority');
    return ticketsAddress({ q: '', state: typeof state === 'string' ? state : 'all', priority: typeof priority === 'string' ? priority : 'all' });
  },
};

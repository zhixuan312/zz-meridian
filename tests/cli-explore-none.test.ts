// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own requests and tickets.
import { describe, expect, it } from 'vitest';

import { clock, collections } from '@/data/collections';
import { runExplore, type ExploreIO, type PreparedQuery } from '@/lib/explore';
import { requestsExplore } from '@/logic/requests-explore';
import { ticketsExplore } from '@/logic/tickets-explore';

/**
 * The requests that reached no model read "no model" on Requests, and the unassigned tickets "unassigned" on Tickets, as
 * the pages say them; an agent narrows to either by naming null, and gets the figure the group gave.
 */
const of = (name: string) => collections.find((c) => c.name === name)!;
const io: ExploreIO = { aggregate: (name, q) => of(name).aggregate(q), read: (name, q) => of(name).query(q), today: clock().toISOString().slice(0, 10) };
const rights = { readable: new Set(['requests', 'tickets']), hidden: () => [] };
const rows = async (name: string) => (await of(name).query({ limit: 500 })).rows as Record<string, unknown>[];

describe('a group with no value, in the sample', () => {
  it('Requests: the requests that reached no model', async () => {
    const none = (await rows('requests')).filter((r) => r.model === null).length;
    expect(none).toBeGreaterThan(0);
    const grouped = (await runExplore(requestsExplore as PreparedQuery, { source: 'requests', measures: ['requests'], by: 'model' }, rights, io, '/requests')).answer;
    expect(grouped).toMatch(new RegExp(`^- no model: ${none} requests$`, 'm'));
    expect(grouped).not.toMatch(/^- null:/m);
    const narrowed = (await runExplore(requestsExplore as PreparedQuery, { source: 'requests', measures: ['requests'], where: [{ field: 'model', op: 'eq', value: null }] }, rights, io, '/requests')).answer;
    expect(narrowed).toContain(`Requests: ${none} requests.`);
  });

  it('Tickets: the tickets nobody is assigned', async () => {
    const all = await rows('tickets');
    const none = all.filter((t) => t.assigneeId === null && t.openedAt !== null).length;
    expect(none).toBeGreaterThan(0);
    const grouped = (await runExplore(ticketsExplore as PreparedQuery, { source: 'opened', measures: ['tickets'], by: 'assigneeId', period: 'all' }, rights, io, '/operations-tickets')).answer;
    expect(grouped).toMatch(/^- unassigned: \d+ tickets/m);
    expect(grouped).not.toMatch(/^- null:/m);
  });
});

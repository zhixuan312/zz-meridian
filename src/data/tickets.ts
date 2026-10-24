/**
 * The tickets page's read. The page and the assistant's tool both read tickets here, so what a person sees and what an
 * agent is told come from one authorized read; the counts over it are `ticketCounts`, beside the context that uses them.
 *
 * Who a ticket is assigned to is joined on the server as a name and nothing else: a Viewer may read tickets and may not
 * read members, so the roster is asked for by the ids the tickets name, straight from the collection, and only the names
 * leave this file.
 */
import { requireNeed } from '@/data/access';
import { members } from '@/data/collections';
import { FEATURES } from '@/data/features';
import { readAll } from '@/data/metrics';
import { projectTicket } from '@/data/projections';
import type { Ticket } from '@/data/sample';

/** A ticket as the page and the tool carry it: the record, and the name of the member it is assigned to. */
export type TicketRow = Ticket & { assignee: string | null };

/** The most ids one query of the roster names. */
const PAGE = 500;

/** Every ticket the caller may read, with the assignee's name on each, and the time the read ran. */
export async function readTickets(): Promise<{ rows: TicketRow[]; revisions: Record<string, string>; observedAt: string }> {
  await requireNeed(FEATURES.tickets.needs);
  const { rows: all, revision, observedAt } = await readAll('tickets');
  const ids = [...new Set(all.flatMap((t) => (typeof t.assigneeId === 'string' ? [t.assigneeId] : [])))];
  const names = new Map<string, string>();
  for (let at = 0; at < ids.length; at += PAGE) {
    const found = await members.query({ where: [{ field: 'id', op: 'in', value: ids.slice(at, at + PAGE) }], limit: PAGE });
    for (const m of found.rows) names.set(m.id, m.name);
  }
  const rows = all.map((row) => projectTicket({ ...row, assignee: typeof row.assigneeId === 'string' ? (names.get(row.assigneeId) ?? null) : null }));
  return { rows, revisions: revision ? { tickets: revision } : {}, observedAt };
}

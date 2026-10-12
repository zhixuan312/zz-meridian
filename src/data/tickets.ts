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
import { read } from '@/data/read';
import type { Ticket } from '@/data/sample';

/** A ticket as the page and the tool carry it: the record, and the name of the member it is assigned to. */
export type TicketRow = Ticket & { assignee: string | null };

/** The most rows one read returns. */
const PAGE = 500;

/** Every ticket the caller may read, with the assignee's name on each, and the time the read ran. */
export async function readTickets(): Promise<{ rows: TicketRow[]; observedAt: string }> {
  await requireNeed(FEATURES.tickets.needs);
  const first = await read('tickets', { limit: PAGE });
  const all = [...first.rows];
  // A read returns a page; keep asking until the total is in hand, so no count is ever of a first page.
  while (all.length < first.total) {
    const next = await read('tickets', { limit: PAGE, offset: all.length });
    if (next.rows.length === 0) throw new Error('Tickets could not be read in full.');
    all.push(...next.rows);
  }
  const tickets = all as Ticket[];
  const ids = [...new Set(tickets.flatMap((t) => (t.assigneeId ? [t.assigneeId] : [])))];
  const names = new Map<string, string>();
  for (let at = 0; at < ids.length; at += PAGE) {
    const found = await members.query({ where: [{ field: 'id', op: 'in', value: ids.slice(at, at + PAGE) }], limit: PAGE });
    for (const m of found.rows) names.set(m.id, m.name);
  }
  return { rows: tickets.map((t) => ({ ...t, assignee: t.assigneeId ? (names.get(t.assigneeId) ?? null) : null })), observedAt: first.observedAt };
}

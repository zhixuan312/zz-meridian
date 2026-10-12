/**
 * Operations tickets' shared context (decision 0011): how many tickets are open, waiting and closed, which of them need
 * a look, and the list the person has filtered to, as both agents read it. The counts are of every ticket, whatever the
 * filters show, and are the same figures the page's tiles draw.
 */
import type { Ticket } from '@/data/sample';
import type { TicketRow } from '@/data/tickets';
import { plural } from '@/lib/format';
import { formatRelative } from '@/lib/format-date';
import { listed, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

/** How many tickets are in each state: the three tiles and the assistant's three facts, of every ticket passed in. */
export function ticketCounts(rows: { state: Ticket['state'] }[]): { open: number; waiting: number; closed: number } {
  const counts = { open: 0, waiting: 0, closed: 0 };
  for (const t of rows) counts[t.state] += 1;
  return counts;
}

type TicketsState = { q: string; state: string; priority: string };

/** The tiles' labels and what they count: the info buttons show the hints and the facts carry the same labels. */
export const TICKET_METRICS = {
  open: { label: 'Open tickets', hint: 'Tickets nobody has finished or parked. The count is of every ticket, not of the rows the filters show.' },
  waiting: { label: 'Waiting tickets', hint: 'Tickets parked until something outside the team happens.' },
  closed: { label: 'Closed tickets', hint: 'Tickets that are done.' },
} as const;

/** The tickets a search and the two filters let through, newest change first: the table's default order. */
export function matchingTickets(rows: TicketRow[], f: TicketsState): TicketRow[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter((t) => (f.state === 'all' || t.state === f.state) && (f.priority === 'all' || t.priority === f.priority))
    .filter((t) => !q || [t.title, t.service, t.assignee ?? ''].some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

export function ticketsAddress(f: TicketsState): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.state !== 'all') p.set('state', f.state);
  if (f.priority !== 'all') p.set('priority', f.priority);
  return `/operations-tickets${p.size ? `?${p}` : ''}`;
}

const DAY = 86_400_000;
/** Days an open ticket may go without a change before it is worth a look. */
export const QUIET_DAYS = 7;

/**
 * The high-priority tickets still in play that nobody owns: the page, the assistant and the bell all ask this one
 * function. A ticket whose assignee is no longer a member has nobody to own it, whatever id it still carries.
 */
export const unownedTickets = (rows: TicketRow[]): TicketRow[] => rows.filter((t) => t.state !== 'closed' && t.priority === 'high' && !t.assignee);

export function ticketsContext(rows: TicketRow[], now: string, f: TicketsState): SharedContext {
  const at = new Date(now);
  const counts = ticketCounts(rows);
  const matching = matchingTickets(rows, f);
  const filters = [f.state !== 'all' && `state ${f.state}`, f.priority !== 'all' && `priority ${f.priority}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');
  const M = TICKET_METRICS;
  const more = 'query_tickets finds them';
  const facts: Fact[] = [
    { label: M.open.label, value: String(counts.open), definition: M.open.hint },
    { label: M.waiting.label, value: String(counts.waiting), definition: M.waiting.hint },
    { label: M.closed.label, value: String(counts.closed), definition: M.closed.hint },
    {
      label: filters ? 'Matching' : 'Shown',
      value: `${matching.length} of ${rows.length}, newest change first: ${listed(matching, (t) => `${t.title} (${t.id}, ${t.state}, ${t.priority}, ${t.service}, ${t.assignee ? `assigned to ${t.assignee}` : 'unassigned'}, opened ${formatRelative(t.openedAt, at)}, changed ${formatRelative(t.updatedAt, at)})`, more, 10)}`,
    },
  ];

  const insights: Insight[] = [];
  const unowned = unownedTickets(rows);
  if (unowned.length) insights.push({ text: `${unowned.length} high-priority ${plural(unowned.length, 'ticket has', 'tickets have')} no owner: ${listed(unowned, (t) => t.title, more, 5)}.` });
  const quiet = rows.filter((t) => t.state === 'open' && at.getTime() - Date.parse(t.updatedAt) >= QUIET_DAYS * DAY);
  if (quiet.length) insights.push({ text: `${quiet.length} open ${plural(quiet.length, 'ticket has', 'tickets have')} not changed for ${QUIET_DAYS} days or more: ${listed(quiet, (t) => t.title, more, 5)}.` });

  return {
    view: 'tickets',
    title: 'Operations tickets',
    address: ticketsAddress(f),
    scope: filters ? `every ticket of this workspace, shown with ${filters}` : 'every ticket of this workspace',
    facts,
    insights,
    unknowns: ['A ticket moves only along open, waiting and closed: an open or waiting ticket may be closed, and a closed one may only be reopened.'],
  };
}

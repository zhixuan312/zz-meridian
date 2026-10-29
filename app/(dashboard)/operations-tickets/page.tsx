import { gate, gatedMetadata, may } from '@/data/access';
import { RefusalScreen } from '@/views/refusal';
import { ACTIONS } from '@/data/features';
import { readAll } from '@/data/read';
import { readTickets } from '@/data/tickets';
import { TicketsView } from '@/views/tickets';
import { createTicket, updateTicket } from './actions';

export function generateMetadata() {
  return gatedMetadata('tickets', { title: 'Tickets' });
}

/**
 * The page asks its feature before it reads anything; the rail hiding the route is presentation, this gate is the check.
 * Every ticket comes from `readTickets`, the read the assistant's tool also uses, so the tiles, the table and what the
 * assistant is told are the same figures.
 *
 * After the read it asks the action table what this person may do, so a control is drawn only where it can be used; the
 * actions re-check, because authority can change between this render and a press. The services the New ticket form
 * offers are read, through an authorized read, only for someone who may create a ticket, and the people offered as
 * assignee only for someone who may read members: a Viewer sees the names on the tickets (the read joins them), is
 * offered nobody, and reads no service.
 */
export default async function TicketsPage() {
  const denied = await gate('tickets');
  if (denied) return RefusalScreen(denied);
  // Each offer's read waits on its own permission, not on the tickets.
  const creates = may(ACTIONS['create-ticket'].needs);
  const readsMembers = may('members:read');
  const [{ rows, revisions, observedAt }, mayCreate, mayUpdate, services, people] = await Promise.all([
    readTickets(),
    creates,
    may(ACTIONS['update-ticket'].needs),
    creates.then((ok) => (ok ? readAll('services').then((r) => r.rows) : [])),
    readsMembers.then((ok) => (ok ? readAll('members').then((r) => r.rows) : [])),
  ]);
  return (
    <TicketsView
      rows={rows}
      now={observedAt}
      revisions={revisions}
      may={{ create: mayCreate, update: mayUpdate }}
      services={services.map((s) => String(s.name))}
      assignees={people.map((m) => ({ id: String(m.id), name: String(m.name) }))}
      createTicket={createTicket}
      updateTicket={updateTicket}
    />
  );
}

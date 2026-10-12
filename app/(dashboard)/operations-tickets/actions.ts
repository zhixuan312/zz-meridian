'use server';

import { collectionFor, resolveAccess } from '@/data/access';
import type { Ticket } from '@/data/sample';
import { TicketRefusal } from '@/data/ticket-mutations';
import type { TicketResult } from '@/views/tickets';

/** What a person types into the form; the boundary checks every field again, so nothing here is trusted. */
type Draft = Pick<Ticket, 'title' | 'service' | 'priority' | 'assigneeId' | 'summary'>;
/** What a change may set on a ticket that exists. */
type Change = Partial<Pick<Ticket, 'title' | 'service' | 'priority' | 'assigneeId' | 'summary' | 'state'>>;

/**
 * Runs one write through the caller's own tickets collection, which is the ticket boundary: it re-resolves who is asking,
 * checks the grant, the fields and the step, and drops the tenant's cached reads of tickets only after the write commits.
 * Its refusal is a sentence, so it comes back as a value the form can show; a thrown error would lose its message in a
 * production build.
 */
async function run(write: (tickets: ReturnType<typeof collectionFor>) => Promise<unknown>): Promise<TicketResult> {
  try {
    await write(collectionFor(await resolveAccess(), 'tickets'));
    return { ok: true };
  } catch (e) {
    // The boundary's refusal is a sentence written for the person; anything else that went wrong is not theirs to read.
    return { ok: false, error: e instanceof TicketRefusal && e.message ? e.message : 'The change did not go through.' };
  }
}

export async function createTicket(input: Draft): Promise<TicketResult> {
  return run((tickets) => tickets.create!({ title: input?.title, service: input?.service, priority: input?.priority, assigneeId: input?.assigneeId ?? null, summary: input?.summary ?? '' }));
}

export async function updateTicket(id: string, change: Change): Promise<TicketResult> {
  return run((tickets) => tickets.update!([id], { ...change }));
}

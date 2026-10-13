/**
 * The ticket boundary: the one place every ticket create and update passes, so the field, reference and step rules hold
 * for a page action, the assistant and an adopter's MCP server alike.
 *
 * It never takes a caller: it re-resolves one from the request's own scope, reads the roster again and refuses anyone who
 * is not an Active member holding the operation's grant, before anything is written. A ticket's state, id and three
 * times are the server's: a create starts `open` at `clock()` whatever the caller sends, and a change stamps `updatedAt`
 * with `clock()` only when something really changes. `closedAt` follows the state, ticket by ticket: a ticket a change
 * moves into closed gets `clock()`, one it moves out of closed gets null, and one that stays where it was keeps what it
 * has. The incident a ticket tracks is not a caller's to set either. A service and an assignee are checked against the
 * collections themselves (`services`, `members`), not through a read the caller might lack. Every write runs inside one
 * promise queue per workspace, and a change naming several tickets is checked whole before any of them is written. A
 * refusal writes nothing, tells no listener and invalidates nothing; its message is a sentence a form can show.
 *
 * The policy and the tag helper are loaded on demand, for the reason `member-mutations.ts` gives: a static import of
 * `src/data/access` would close a cycle, because the demo policy binds `tickets` through this module.
 */
import { clock, members, services, tickets } from '@/data/collections';
import { effective } from '@/data/roles';
import type { AnyCollection, Grant } from '@/lib/collection';
import type { Ticket } from '@/system/fixtures/sample-engineering';
import type { AccessScope } from '@/data/access';
import { invalidate, writeQueue } from '@/data/write-boundary';

/** Every refusal the boundary produces. */
const REFUSALS = {
  signIn: 'Sign in again to make this change.',
  noGrant: 'You do not have permission to make this change.',
  title: 'Give the ticket a title of 1 to 160 characters.',
  summary: 'Keep the summary to 4,000 characters or fewer.',
  priority: 'Choose a priority: low, normal or high.',
  state: 'Choose a state: open, waiting or closed.',
  service: 'Choose a service that exists.',
  assignee: 'Choose a member of the workspace to assign the ticket to, or leave it unassigned.',
  fixed: 'A ticket\'s id, its times and its incident are set by the system and cannot be changed.',
} as const;

const PRIORITIES: readonly string[] = ['low', 'normal', 'high'];
const STATES: readonly string[] = ['open', 'waiting', 'closed'];
/** The five steps a ticket may take; a ticket asked for the state it has takes none. */
const STEPS: Record<string, readonly string[]> = { open: ['waiting', 'closed'], waiting: ['open', 'closed'], closed: ['open'] };
/** What a change may set. */
const SETTABLE = ['title', 'service', 'priority', 'assigneeId', 'summary', 'state'] as const;

/** A boundary refusal: thrown, so a page turns its message into a reason and an agent's tool reports it. */
export class TicketRefusal extends Error {}

const load: { policy?: Promise<typeof import('@/data/access')>; tag?: Promise<typeof import('@/data/read')> } = {};
const policy = () => (load.policy ??= import('@/data/access'));
const tagOf = () => (load.tag ??= import('@/data/read'));

/** The caller's grants, re-read from the request's own scope and the roster, or a refusal when no Active person is signed in. */
async function callerOrThrow(): Promise<ReadonlySet<Grant>> {
  const { resolveAccess } = await policy();
  const scope = await resolveAccess().catch(() => null);
  const member = scope ? (await members.query({ where: [{ field: 'id', op: 'eq', value: scope.subjectId }] })).rows[0] : undefined;
  if (!member || member.status !== 'Active') throw new TicketRefusal(REFUSALS.signIn);
  return effective(member.role, member.addOns);
}

/** Ticket writes run one at a time for a workspace. */
const enqueue = writeQueue('ticket-writes');

/** The tickets collection, bound to a scope: its create and update pass the boundary, its reads do not. */
export function ticketsFor(scope: AccessScope): AnyCollection {
  return {
    ...tickets,
    create: (input: Record<string, unknown>) => enqueue(scope.tenantId, () => createStep(scope, input)),
    update: (ids: string[], patch: Record<string, unknown>) => enqueue(scope.tenantId, () => updateStep(scope, ids, patch)),
  };
}

const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.length <= max ? value : null);

/** Each field of `values` that is present, checked on its own and returned as it will be stored. */
async function checked(values: Record<string, unknown>): Promise<Partial<Ticket>> {
  const out: Partial<Ticket> = {};
  if (values.title !== undefined) {
    const title = typeof values.title === 'string' ? values.title.trim() : '';
    if (title.length === 0 || title.length > 160) throw new TicketRefusal(REFUSALS.title);
    out.title = title;
  }
  if (values.summary !== undefined) {
    const summary = text(values.summary, 4000);
    if (summary === null) throw new TicketRefusal(REFUSALS.summary);
    out.summary = summary;
  }
  if (values.priority !== undefined) {
    if (typeof values.priority !== 'string' || !PRIORITIES.includes(values.priority)) throw new TicketRefusal(REFUSALS.priority);
    out.priority = values.priority as Ticket['priority'];
  }
  if (values.state !== undefined) {
    if (typeof values.state !== 'string' || !STATES.includes(values.state)) throw new TicketRefusal(REFUSALS.state);
    out.state = values.state as Ticket['state'];
  }
  if (values.service !== undefined) {
    const found = typeof values.service === 'string' ? (await services.query({ where: [{ field: 'name', op: 'eq', value: values.service }] })).total : 0;
    if (found === 0) throw new TicketRefusal(REFUSALS.service);
    out.service = values.service as string;
  }
  if (values.assigneeId !== undefined) {
    if (values.assigneeId !== null) {
      const found = typeof values.assigneeId === 'string' ? (await members.query({ where: [{ field: 'id', op: 'eq', value: values.assigneeId }] })).total : 0;
      if (found === 0) throw new TicketRefusal(REFUSALS.assignee);
    }
    out.assigneeId = values.assigneeId as string | null;
  }
  return out;
}

/** A create: the grant, then the caller's own fields; the state, the id and the times are the server's, and a new ticket is closed at no time and tracks no incident. */
async function createStep(scope: AccessScope, input: Record<string, unknown>): Promise<Ticket> {
  if (!(await callerOrThrow()).has('tickets:create')) throw new TicketRefusal(REFUSALS.noGrant);
  if (input.title === undefined) throw new TicketRefusal(REFUSALS.title);
  if (input.service === undefined) throw new TicketRefusal(REFUSALS.service);
  if (input.priority === undefined) throw new TicketRefusal(REFUSALS.priority);
  const own = await checked({ title: input.title, service: input.service, priority: input.priority, assigneeId: input.assigneeId ?? null, summary: input.summary ?? '' });
  const now = clock().toISOString();
  const row = await tickets.create!({ ...own, state: 'open', openedAt: now, updatedAt: now, closedAt: null, incidentId: null });
  invalidate(await (await tagOf()).collectionTag(scope.tenantId, 'tickets'));
  return row;
}

/**
 * A change: the grant, only the fields a change may set, every field checked, and every named ticket found and allowed
 * the step it asks for, all before any is written. A ticket the change would leave as it is (including one asked for the
 * state it already has) is not written and not stamped. Returns the tickets that changed.
 *
 * One change sets one state, so the tickets it changes are of two kinds: those it moves across the line between closed
 * and not, whose closing time is set or cleared, and those it does not, whose closing time is left alone. Each kind is
 * one write, both inside this queued step. A product writes the two in one transaction.
 */
async function updateStep(scope: AccessScope, ids: string[], patch: Record<string, unknown>): Promise<Ticket[]> {
  if (!(await callerOrThrow()).has('tickets:update')) throw new TicketRefusal(REFUSALS.noGrant);
  if (Object.keys(patch).some((field) => !(SETTABLE as readonly string[]).includes(field))) throw new TicketRefusal(REFUSALS.fixed);
  const set = await checked(patch);
  const found = (await tickets.query({ where: [{ field: 'id', op: 'in', value: ids }] })).rows;
  const missing = ids.filter((id) => !found.some((t) => t.id === id));
  if (missing.length) throw new TicketRefusal(`No ticket has the id ${missing.join(', ')}.`);
  for (const t of found) {
    if (set.state !== undefined && set.state !== t.state && !STEPS[t.state].includes(set.state)) throw new TicketRefusal(`A ${t.state} ticket cannot be moved to ${set.state}.`);
  }
  const changing = found.filter((t) => (Object.keys(set) as (keyof Ticket)[]).some((field) => set[field] !== t[field]));
  if (changing.length === 0) return [];
  const now = clock().toISOString();
  const closing = set.state === 'closed';
  const crosses = (t: Ticket) => set.state !== undefined && closing !== (t.state === 'closed');
  const [crossing, staying] = [changing.filter(crosses), changing.filter((t) => !crosses(t))];
  const out = [
    ...(crossing.length ? await tickets.update!(crossing.map((t) => t.id), { ...set, updatedAt: now, closedAt: closing ? now : null }) : []),
    ...(staying.length ? await tickets.update!(staying.map((t) => t.id), { ...set, updatedAt: now }) : []),
  ];
  invalidate(await (await tagOf()).collectionTag(scope.tenantId, 'tickets'));
  return out;
}

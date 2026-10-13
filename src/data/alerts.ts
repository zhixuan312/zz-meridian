/**
 * The alerts behind the shell's bell: the product's exceptions, each worked out from a read the caller may make and by
 * the same functions Main's regions and the detail pages use, so a count in the bell and the same count on its page
 * cannot differ. Nothing here is typed by hand.
 *
 * Each kind is read apart from the others: one that cannot be read leaves out its own alerts and keeps the rest. A
 * caller with no session is refused before any of them is read, so nobody is told anything.
 */
import { resolveAccess } from '@/data/access';
import { readRuns } from '@/data/engineering';
import type { Incident } from '@/components/patterns/incident-card';
import { clock } from '@/data/collections';
import { readAll } from '@/data/read';
import type { CustomerRecord } from '@/data/sample';
import { readTickets } from '@/data/tickets';
import type { Alert } from '@/components/patterns/shell-tools';
import { customerFigures, customersAddress } from '@/views/customers-context';
import { operationOf } from '@/views/main-summary';
import { testFigures, testsAddress } from '@/views/tests-context';
import { ticketsAddress, unownedTickets } from '@/views/tickets-context';

/** An alert as the shell's tools take it, and the time of the read that told it. */
export type AlertsRead = { alerts: Alert[]; now: string };

/** A kind of alert whose read throws is missing, not empty. */
async function attempt<T>(kind: () => Promise<T>): Promise<T | null> {
  try {
    return await kind();
  } catch {
    return null;
  }
}

const later = (a: string, b: string) => (a > b ? a : b);

/** The incidents nobody has resolved, newest first, each timed by its latest update. */
async function incidentAlerts(): Promise<{ alerts: Alert[]; observedAt: string }> {
  const { rows, observedAt } = await readAll('incidents');
  const all = [...(rows as Incident[])].sort((a, b) => (a.started < b.started ? 1 : a.started > b.started ? -1 : 0));
  const open = new Set(operationOf([], all).incidents.map((i) => i.id));
  const alerts = all.filter((i) => open.has(i.id)).map((i): Alert => ({
    id: `incident:${i.id}`,
    title: i.title,
    detail: `${i.service} · ${i.state === 'investigating' ? 'Investigating' : 'Monitoring'}`,
    at: i.updates.at(-1)?.at ?? i.started,
    href: '/services',
    tone: 'warning',
    unread: true,
  }));
  return { alerts, observedAt };
}

/** Each customer past due, linking to Customers filtered to the customers who are. */
async function customerAlerts(): Promise<{ alerts: Alert[]; observedAt: string }> {
  const { rows, observedAt } = await readAll('customers');
  const href = customersAddress({ q: '', plan: 'all', status: 'past due', sort: 'revenue', dir: 'desc', page: '1' });
  const alerts = customerFigures(rows as CustomerRecord[]).pastDue.map((c): Alert => ({
    id: `customer:${c.id}`,
    title: `${c.name} is past due`,
    detail: 'Their latest invoice is overdue',
    at: observedAt,
    href,
    tone: 'warning',
  }));
  return { alerts, observedAt };
}

/** One alert saying how many verifications are failing, when any are. */
async function verificationAlerts(): Promise<{ alerts: Alert[]; observedAt: string }> {
  const { rows, observedAt } = await readRuns();
  const { failing } = testFigures(rows);
  if (!failing.length) return { alerts: [], observedAt };
  return {
    alerts: [{
      id: 'verifications:failing',
      title: `${failing.length} ${failing.length === 1 ? 'verification is' : 'verifications are'} failing`,
      detail: 'The latest run of each has failed',
      at: failing.reduce((t, r) => later(t, r.startedAt), failing[0].startedAt),
      href: testsAddress({ q: '', state: 'failed', release: '', runs: 'latest' }),
      tone: 'critical',
    }],
    observedAt,
  };
}

/** Each high-priority ticket that is open or waiting and has nobody assigned, newest change first. */
async function ticketAlerts(): Promise<{ alerts: Alert[]; observedAt: string }> {
  const { rows, observedAt } = await readTickets();
  const alerts = unownedTickets(rows)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
    .map((t): Alert => ({
      id: `ticket:${t.id}`,
      title: `${t.title} has no owner`,
      detail: `High priority · ${t.service}`,
      at: t.updatedAt,
      // The list filtered to this ticket: its own title is what the search matches.
      href: ticketsAddress({ q: t.title, state: 'all', priority: 'high' }),
      tone: 'warning',
    }));
  return { alerts, observedAt };
}

/**
 * What needs a person, in the order the bell shows it: the unresolved incidents, the customers past due, the failing
 * verifications and the high-priority tickets nobody has. `now` is the latest time any of the reads ran, and no alert is
 * timed after it. Refused to a caller with no session.
 */
export async function readAlerts(): Promise<AlertsRead> {
  await resolveAccess();
  const kinds = (await Promise.all([attempt(incidentAlerts), attempt(customerAlerts), attempt(verificationAlerts), attempt(ticketAlerts)])).filter((k) => k !== null);
  const now = kinds.reduce((t, k) => later(t, k.observedAt), '') || clock().toISOString();
  return { alerts: kinds.flatMap((k) => k.alerts.map((a) => ({ ...a, at: a.at > now ? now : a.at }))), now };
}

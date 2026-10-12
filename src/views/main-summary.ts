/**
 * What Main says of the whole product (decision 0011): three summaries, one for the business, one for the operation and
 * one for delivery, each built from every row of the collections it counts and by the functions the detail pages use,
 * so a figure here and the same figure on its page cannot differ. A summary whose data did not arrive is `null`.
 *
 * Pure functions with type-only imports of the server's modules, because the client views import this file.
 */
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import type { ReleaseRow } from '@/data/engineering';
import type { CustomerRecord, Ticket, VerificationRun } from '@/data/sample';
import { latestRuns } from '@/data/verification';
import { customerFigures } from './customers-context';
import { releaseFigures } from './releases-context';
import { ticketCounts } from './tickets-context';

type MainBusiness = { customers: number; byStatus: Record<string, number>; byPlan: Record<string, number>; spend: number };
type MainOperation = { degraded: string[]; outage: string[]; incidents: { id: string; title: string }[] };
type MainDelivery = { open: number; waiting: number; failing: number; live: number; ready: number; testing: number };
export type MainSummary = { business: MainBusiness | null; operation: MainOperation | null; delivery: MainDelivery | null };

/** How many rows hold each value of `field`, keyed as the collection spells the value. */
function tally(rows: CustomerRecord[], field: 'status' | 'plan'): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r[field]] = (counts[r[field]] ?? 0) + 1;
  return counts;
}

/** Every customer: how many, how many of each status and plan, and what they spent in the last thirty days. */
export function businessOf(customers: CustomerRecord[]): MainBusiness {
  const { customers: count, spend } = customerFigures(customers);
  return { customers: count, byStatus: tally(customers, 'status'), byPlan: tally(customers, 'plan'), spend };
}

/** The services that are not operational, by name and in the services' order, and each incident nobody has resolved. */
export function operationOf(services: Pick<Service, 'name' | 'status'>[], incidents: Pick<Incident, 'id' | 'title' | 'state'>[]): MainOperation {
  const named = (status: Service['status']) => services.filter((s) => s.status === status).map((s) => s.name);
  return { degraded: named('degraded'), outage: named('outage'), incidents: incidents.filter((i) => i.state !== 'resolved').map(({ id, title }) => ({ id, title })) };
}

/** Open and waiting tickets, the latest runs that failed, and the releases as the Releases page's tiles count them. */
export function deliveryOf(tickets: Pick<Ticket, 'state'>[], runs: VerificationRun[], releases: ReleaseRow[]): MainDelivery {
  const { open, waiting } = ticketCounts(tickets);
  const { live, ready, testing } = releaseFigures(releases);
  return { open, waiting, failing: latestRuns(runs).filter((r) => r.state === 'failed').length, live: live.length, ready, testing };
}

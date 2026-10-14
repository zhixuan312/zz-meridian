import { gate, may, Unauthenticated } from '@/data/access';
import { attempt } from '@/data/main';
import { read } from '@/data/read';
import { readEndpoints } from '@/data/metrics';
import { ACTIONS, FEATURES } from '@/data/features';
import { FEATURED_REQUEST_IDS, traceOf, payloadsOf, type CustomerRecord, type RequestRow } from '@/data/sample';
import { customerAddress } from '@/views/customer-context';
import { MissingPage } from '@/views/missing-page';
import { actionLine } from '@/views/no-access';
import { RequestView } from '@/views/request';
import { replayRequest } from './actions';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

const byId = async (id: string) => {
  const { rows, observedAt } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }] });
  return { request: rows[0] as RequestRow | undefined, observedAt };
};

/**
 * The page of the customer a request names: the request keeps the customer's name, so its id is worked out here, on the
 * server, from the customers. Null when they hold no customer of that name or cannot be read: the name is then text.
 */
async function customerPage(name: string) {
  const found = await attempt(async () => (await read('customers', { where: [{ field: 'name', op: 'eq', value: name }], limit: 1 })).rows[0] as CustomerRecord | undefined);
  return found ? customerAddress(found.id) : null;
}

/**
 * The record's own title, for a person who may open the request: the id, or the missing-request screen. A person who may
 * not is told the feature's own title instead, and no record is read for them — the metadata runs before the page's gate
 * and must not become the read that discloses what the gate then refuses. No session is the same answer: nothing about
 * the record is told to somebody the roster cannot resolve.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await may(FEATURES.request.needs).catch((error: unknown) => {
    if (error instanceof Unauthenticated) return false;
    throw error;
  });
  if (!allowed) return { title: FEATURES.request.title };
  return (await byId(id)).request ? { title: id } : { title: 'Not found', robots: { index: false } };
}

/** The detail asks its feature first, before the record is read: the rail never links this route, and hiding is presentation, not the gate. */
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await gate('request');
  if (denied) return denied;
  const { request: r, observedAt } = await byId(id);
  // Rendered here rather than thrown, so the screen is in the first HTML (see MissingPage).
  if (!r) return <MissingPage />;
  // After the gate: what this person may do with the record, so Replay is drawn only where it may be used. A Member
  // holds `requests:read` without `requests:create`, so it is withheld for them and the line says who can.
  const mayReplay = await may(ACTIONS['replay-request'].needs);
  const [endpoints, customerHref] = await Promise.all([readEndpoints(), customerPage(r.customer)]);
  const route = endpoints.find((e) => e.method === r.method && e.route === r.route);
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} routeP95={route?.p95 ?? null} now={observedAt} mayReplay={mayReplay} replayLine={actionLine('replay-request')} replay={replayRequest} customerHref={customerHref} />;
}

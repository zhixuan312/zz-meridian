import { gate, gatedMetadata, may, Unauthenticated } from '@/data/access';
import { RefusalScreen } from '@/views/refusal';
import { attempt } from '@/data/main';
import { read } from '@/data/read';
import { readEndpoints } from '@/data/metrics';
import { ACTIONS, FEATURES } from '@/data/features';
import { FEATURED_REQUEST_IDS, traceOf, payloadsOf } from '@/data/sample';
import { projectRequest } from '@/data/projections';
import { customerAddress } from '@/logic/customer-context';
import { MissingPage } from '@/views/missing-page';
import { NOT_FOUND } from '@/views/not-found';
import { RequestView } from '@/views/request';
import { replayRequest } from './actions';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

const byId = async (id: string) => {
  const { rows, observedAt } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }] });
  return { request: rows[0] ? projectRequest(rows[0]) : undefined, observedAt };
};

/**
 * The page of the customer a request names: the request keeps the customer's name, so its id is worked out here, on the
 * server, from the customers. Null when they hold no customer of that name or cannot be read: the name is then text.
 */
async function customerPage(name: string) {
  const found = await attempt(async () => (await read('customers', { where: [{ field: 'name', op: 'eq', value: name }], limit: 1 })).rows[0]);
  return found && typeof found.id === 'string' ? customerAddress(found.id) : null;
}

/**
 * The record's own title, for a person who may open the request: the id, or the missing-request screen. A person who may
 * not is told what the product's refusal says (`gatedMetadata`: the feature's own title, or the missing page's), and no
 * record is read for them — the metadata runs before the page's gate and must not become the read that discloses what
 * the gate then refuses. No session is the same answer: nothing about the record is told to somebody the roster cannot
 * resolve.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await may(FEATURES.request.needs).catch((error: unknown) => {
    if (error instanceof Unauthenticated) return false;
    throw error;
  });
  if (!allowed) return gatedMetadata('request', { title: FEATURES.request.title });
  return (await byId(id)).request ? { title: id } : { title: NOT_FOUND.title, robots: { index: false } };
}

/** The detail asks its feature first, before the record is read: the rail never links this route, and hiding is presentation, not the gate. */
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await gate('request');
  if (denied) return RefusalScreen(denied);
  // Everything the page needs that does not depend on the record is asked beside it, in one wait: the record, the
  // grant behind Replay and the endpoints that give the route its p95 were three waits in a row before.
  //
  // After the gate: what this person may do with the record, so Replay is drawn only where it may be used. A Viewer
  // holds `requests:read` without `requests:create`, so it is withheld for them and nothing is drawn in its place.
  const [{ request: r, observedAt }, mayReplay, endpoints] = await Promise.all([byId(id), may(ACTIONS['replay-request'].needs), readEndpoints()]);
  // Rendered here rather than thrown, so the screen is in the first HTML (see MissingPage).
  if (!r) return <MissingPage />;
  const customerHref = await customerPage(r.customer);
  const route = endpoints.find((e) => e.method === r.method && e.route === r.route);
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} routeP95={route?.p95 ?? null} now={observedAt} mayReplay={mayReplay} replay={replayRequest} customerHref={customerHref} />;
}

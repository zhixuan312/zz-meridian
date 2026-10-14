/**
 * What the bell says of the operation (decision 0011): the incidents nobody has resolved and the services that are not
 * operational, from every row of the collections it counts.
 *
 * A pure function with type-only imports, because the client views import this file.
 */
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';

type MainOperation = { degraded: string[]; outage: string[]; incidents: { id: string; title: string }[] };

/** The services that are not operational, by name and in the services' order, and each incident nobody has resolved. */
export function operationOf(services: Pick<Service, 'name' | 'status'>[], incidents: Pick<Incident, 'id' | 'title' | 'state'>[]): MainOperation {
  const named = (status: Service['status']) => services.filter((s) => s.status === status).map((s) => s.name);
  return { degraded: named('degraded'), outage: named('outage'), incidents: incidents.filter((i) => i.state !== 'resolved').map(({ id, title }) => ({ id, title })) };
}

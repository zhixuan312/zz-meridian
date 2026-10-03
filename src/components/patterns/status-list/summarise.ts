import type { Service } from '@/components/patterns/status-list';

/** The worst state among the services, in words: the line a reader takes away. */
export function summarise(services: Service[]) {
  const down = services.filter((s) => s.status === 'outage').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  if (down) return { status: 'outage' as const, text: `${down} ${down === 1 ? 'service is' : 'services are'} down` };
  if (degraded) return { status: 'degraded' as const, text: `${degraded} ${degraded === 1 ? 'service' : 'services'} degraded` };
  return { status: 'operational' as const, text: 'All systems operational' };
}

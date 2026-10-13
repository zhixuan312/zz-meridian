/**
 * Now's shared context (decision 0011): which services are up this moment and which incident is open, as both agents
 * read it. History and the incidents already resolved belong to Services (/services), which the context says.
 */
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import { formatDuration, plural } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

/** `current` is the newest incident nobody has resolved, the one the page leads with; `alsoOpen` is every other one. */
export type NowData = { services: Service[]; current: Incident | null; alsoOpen: Incident[]; updatedAt: string; now: string };

export function nowContext({ services, current, alsoOpen, updatedAt, now }: NowData): SharedContext {
  const at = new Date(now);
  const sum = summarise(services);
  const apart = services.filter((s) => s.status !== 'operational');
  const facts: Fact[] = [
    { label: 'Services now', value: `${sum.text}${apart.length ? ` (${apart.map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` },
    ...services.map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)}` })),
  ];
  const insights: Insight[] = [];
  if (current) {
    const latest = current.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
    insights.push({ text: `Open incident "${current.title}" on ${current.service}, ${current.severity}, ${current.state}: started ${formatRelative(current.started, at)} (${formatDateTime(current.started)} UTC)${latest ? `; latest update ${formatRelative(latest.at, at)}: "${latest.text}"` : ''}.`, evidence: '/services' });
  } else {
    insights.push({ text: 'No incident is open.' });
  }
  if (alsoOpen.length) insights.push({ text: `${alsoOpen.length} other ${plural(alsoOpen.length, 'incident is', 'incidents are')} open: ${alsoOpen.map((i) => `"${i.title}" on ${i.service}`).join('; ')}.`, evidence: '/services' });
  return {
    view: 'now',
    title: 'Now',
    address: '/engineering',
    scope: 'every monitored service as it is now, and the incidents nobody has resolved',
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights,
    unknowns: ['Latency is one reading per service, now; the last 90 days and the resolved incidents are on Services (/services).', ...(current?.state === 'monitoring' ? ['The open incident is monitoring: a fix is in place, and nobody has yet confirmed it holds.'] : [])],
  };
}

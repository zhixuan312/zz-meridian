/**
 * Now's shared context (decision 0011): which services are up this moment and which incident is open, as both agents
 * read it, led by the title the page is headed by and the days inside the band. History and the incidents already
 * resolved belong to Services (/services), which the context says.
 */
import { facts as rules } from '@/app.config';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import type { DailyPoint } from '@/data/sample';
import { steady } from '@/lib/facts';
import { formatDuration, plural } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { STATE, handed, headInsights, worst, type PageHead, type ServiceNow } from './fact-insight';

/**
 * `current` is the newest incident nobody has resolved, the one the page leads with; `alsoOpen` is every other one.
 * `head` is the page's title and the days inside the band, worked out on the server (`nowHead`).
 */
export type NowData = { services: Service[]; current: Incident | null; alsoOpen: Incident[]; head: PageHead; updatedAt: string; now: string };

/**
 * Now's title, from plain figures: what is wrong first, the worst state any service is in (one named, several counted),
 * or that every service is operational; then how many releases are in testing. `testing` is null when the releases
 * could not be read, and the title is the services' clause alone.
 */
export function nowTitle({ services, testing }: { services: readonly ServiceNow[]; testing: number | null }): string {
  const unwell = worst(services);
  const said = unwell
    ? `${unwell.names.length === 1 ? `${unwell.names[0]} is` : `${unwell.names.length} services are`} ${STATE[unwell.state]}`
    : `All ${services.length} ${plural(services.length, 'service is', 'services are')} operational`;
  if (testing === null) return said;
  return `${said}, and ${testing ? `${testing} ${plural(testing, 'release is', 'releases are')}` : 'no release is'} in testing`;
}

/**
 * What Now states at its head, worked out on the server: its title from the services and the releases in testing, and
 * the days inside the band over every complete day kept, with `facts.band`. `testing` and `history` are null when they
 * could not be read: the title then leaves out what it cannot say, and the context says what was not read. A product
 * with no service yet is headed by the page's name.
 */
export function nowHead({ services, testing, history }: { services: readonly ServiceNow[]; testing: number | null; history: readonly DailyPoint[] | null }): PageHead {
  const held = history && steady(history, rules.band);
  const unread = [
    testing === null && 'The releases could not be read, so the title does not say how many are in testing.',
    !history && 'The days could not be read, so no day is counted inside the band.',
  ].filter(Boolean);
  return {
    title: services.length ? nowTitle({ services, testing }) : null,
    facts: held ? [handed(held, '/engineering')] : [],
    ...(unread.length ? { unknown: unread.join(' ') } : {}),
  };
}

export function nowContext({ services, current, alsoOpen, head, updatedAt, now }: NowData): SharedContext {
  const at = new Date(now);
  const sum = summarise(services);
  const apart = services.filter((s) => s.status !== 'operational');
  const facts: Fact[] = [
    { label: 'Services now', value: `${sum.text}${apart.length ? ` (${apart.map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` },
    ...services.map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)}` })),
  ];
  // The title first, as the page is headed, then the days inside the band: what the page states before what is open.
  const insights: Insight[] = headInsights(head);
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
    unknowns: ['Latency is one reading per service, now; the last 90 days and the resolved incidents are on Services (/services).', ...(current?.state === 'monitoring' ? ['The open incident is monitoring: a fix is in place, and nobody has yet confirmed it holds.'] : []), ...(head.unknown ? [head.unknown] : [])],
  };
}

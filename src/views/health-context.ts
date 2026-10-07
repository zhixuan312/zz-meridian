/**
 * Health's shared context (decision 0011): the console page, the MCP view and the console's assistant read the same
 * account of every service now, its last 90 days, and the incidents that explain them.
 */
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import { formatDuration } from '@/lib/format';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';

export type HealthData = { services: Service[]; current: Incident | null; past: Incident[]; updatedAt: string; now: string };

const uptime = (n: number) => `${(n * 100).toFixed(n >= 0.9999 ? 3 : 2)}%`;
const hours = (a: string, b: string) => {
  const h = (Date.parse(b) - Date.parse(a)) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;
};

export function healthContext(data: HealthData): SharedContext {
  const { services, current, past } = data;
  const now = new Date(data.now);
  const sum = summarise(services);
  const days = services[0]?.days.length ?? 0;
  const average = services.length ? services.reduce((a, s) => a + s.uptime, 0) / services.length : 0;
  const facts: Fact[] = [
    { label: 'Services now', value: `${sum.text}${services.some((s) => s.status !== 'operational') ? ` (${services.filter((s) => s.status !== 'operational').map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` },
    { label: `Uptime, all services, ${days} days`, value: uptime(average), definition: 'The average of each service\'s share of time operational.' },
    ...services.map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)} now, uptime ${uptime(s.uptime)}` })),
  ];

  const insights: Insight[] = [];
  const unknowns: string[] = [];
  // Which service carries the history, beyond what the state now shows.
  const below = services.map((s) => ({ s, n: s.days.filter((d) => d !== 'operational').length })).sort((a, b) => b.n - a.n);
  const worstDays = services[0]?.days.map((_, i) => services.some((s) => s.days[i] !== 'operational')).filter(Boolean).length ?? 0;
  if (below[0]?.n) insights.push({ text: `${worstDays} of the last ${days} days had a service below operational; ${below[0].s.name} accounts for ${below[0].n} of them${below[1]?.n ? `, ${below[1].s.name} for ${below[1].n}` : ''}.`, evidence: '/health' });
  const lowest = services.reduce((m, s) => (s.uptime < m.uptime ? s : m), services[0]);
  if (lowest && lowest.uptime < average) insights.push({ text: `${lowest.name} has the lowest uptime, ${uptime(lowest.uptime)}, against ${uptime(average)} across all services.` });
  if (current) {
    const latest = current.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
    insights.push({ text: `Open incident "${current.title}" on ${current.service}, ${current.severity}, ${current.state}: started ${formatRelative(current.started, now)} (${formatDateTime(current.started)} UTC)${latest ? `; latest update ${formatRelative(latest.at, now)}: "${latest.text}"` : ''}.`, evidence: '/health' });
    if (current.state === 'monitoring') unknowns.push('The open incident is monitoring: a fix is in place, and nobody has yet confirmed it holds.');
  }
  const resolved = past.filter((i) => i.resolved);
  if (resolved.length) {
    const longest = resolved.reduce((m, i) => (Date.parse(i.resolved!) - Date.parse(i.started) > Date.parse(m.resolved!) - Date.parse(m.started) ? i : m));
    insights.push({ text: `${resolved.length} incident${resolved.length === 1 ? '' : 's'} resolved in the period; the longest, "${longest.title}" on ${formatDate(longest.started)}, lasted ${hours(longest.started, longest.resolved!)}.` });
  }
  unknowns.push('Latency is one reading per service, now; there is no latency history here to say whether it is unusual.');

  return { view: 'health', title: 'Health', address: '/health', scope: `every monitored service, now and the last ${days} days`, freshness: freshnessOf(data.updatedAt, data.now), facts, insights, unknowns };
}

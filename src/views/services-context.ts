/**
 * Services' shared context (decision 0011): the console page, the MCP view and the console's assistant read the same
 * account of every service now, its last 90 days, and the incidents that explain them, led by the title the page is
 * headed by and the days inside the band.
 */
import { facts as rules } from '@/app.config';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import type { DailyPoint } from '@/data/sample';
import { run, steady } from '@/lib/facts';
import { formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { handed, headInsights, inDays, type PageHead } from './fact-insight';

/**
 * `current` is the newest incident nobody has resolved, the one the page leads with; `alsoOpen` is every other one.
 * `head` is the page's title and the days inside the band, worked out on the server (`servicesHead`).
 */
export type ServicesData = { services: Service[]; current: Incident | null; alsoOpen?: Incident[]; past: Incident[]; head: PageHead; updatedAt: string; now: string };

/** The uptime the page states for its days: the mean of each service's own. */
const meanUptime = (services: readonly Pick<Service, 'uptime'>[]) => (services.length ? services.reduce((a, s) => a + s.uptime, 0) / services.length : 0);

/**
 * Services' title, from plain figures: the uptime of its days, two decimals, then the run of a service when one is
 * named. `run` is null when no service is on its longest run.
 */
export function servicesTitle({ uptime, days, run: held }: { uptime: number; days: number; run: { name: string; length: number } | null }): string {
  const said = `${formatPercent(uptime, 2)} uptime in ${inDays(days)}`;
  return held ? `${said}, and ${held.name} has run ${held.length} ${plural(held.length, 'day')} without a mark` : said;
}

/**
 * What Services states at its head, worked out on the server. The title's uptime is the one the page states for the
 * services' days, and its run is that of the service whose current run is the longest, the team's order deciding a
 * tie, named only when it is that service's longest and does not reach the earliest day of its strip. After it, the
 * days inside the band over every complete day kept, with `facts.band`. `history` is those days, or null when they
 * could not be read: the page is then headed by the uptime alone and the context says so. A product with no service
 * yet is headed by the page's name.
 */
export function servicesHead({ services, history }: { services: readonly Pick<Service, 'name' | 'uptime' | 'days'>[]; history: readonly DailyPoint[] | null }): PageHead {
  const held = history && steady(history, rules.band);
  const facts = held ? [handed(held, '/services')] : [];
  const unknown = history ? {} : { unknown: 'The days could not be read, so the title states the uptime alone and no day is counted inside the band.' };
  if (!services.length) return { title: null, facts, ...unknown };
  // The longest current run of all: the first in the team's order wins a tie, because a later one must be longer to replace it.
  const runs = services.map((s) => run(s.days, 'operational', { name: s.name }));
  const leader = runs.reduce<(typeof runs)[number]>((m, r) => (r && (!m || r.length > m.length) ? r : m), null);
  const named = history && leader?.longest ? { name: services[runs.indexOf(leader)].name, length: leader.length } : null;
  return { title: servicesTitle({ uptime: meanUptime(services), days: services[0].days.length, run: named }), facts, ...unknown };
}

const uptime = (n: number) => `${(n * 100).toFixed(n >= 0.9999 ? 3 : 2)}%`;
const hours = (a: string, b: string) => {
  const h = (Date.parse(b) - Date.parse(a)) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;
};

export function servicesContext(data: ServicesData): SharedContext {
  const { services, current, past, head } = data;
  const now = new Date(data.now);
  const sum = summarise(services);
  const days = services[0]?.days.length ?? 0;
  const average = meanUptime(services);
  const facts: Fact[] = [
    { label: 'Services now', value: `${sum.text}${services.some((s) => s.status !== 'operational') ? ` (${services.filter((s) => s.status !== 'operational').map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` },
    { label: `Uptime, all services, ${days} days`, value: uptime(average), definition: 'The average of each service\'s uptime, which is 1 less what its marked days cost: half an hour a degraded day, two hours a day of outage.' },
    ...services.map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)} now, uptime ${uptime(s.uptime)}` })),
  ];

  // The title first, as the page is headed, then the days inside the band: what the page states before what explains it.
  const insights: Insight[] = headInsights(head);
  const unknowns: string[] = head.unknown ? [head.unknown] : [];
  // Which service carries the history, beyond what the state now shows.
  const below = services.map((s) => ({ s, n: s.days.filter((d) => d !== 'operational').length })).sort((a, b) => b.n - a.n);
  const worstDays = services[0]?.days.map((_, i) => services.some((s) => s.days[i] !== 'operational')).filter(Boolean).length ?? 0;
  if (below[0]?.n) insights.push({ text: `${worstDays} of the last ${days} days had a service below operational; ${below[0].s.name} accounts for ${below[0].n} of them${below[1]?.n ? `, ${below[1].s.name} for ${below[1].n}` : ''}.`, evidence: '/services' });
  const lowest = services.reduce((m, s) => (s.uptime < m.uptime ? s : m), services[0]);
  if (lowest && lowest.uptime < average) insights.push({ text: `${lowest.name} has the lowest uptime, ${uptime(lowest.uptime)}, against ${uptime(average)} across all services.` });
  if (current) {
    const latest = current.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
    insights.push({ text: `Open incident "${current.title}" on ${current.service}, ${current.severity}, ${current.state}: started ${formatRelative(current.started, now)} (${formatDateTime(current.started)} UTC)${latest ? `; latest update ${formatRelative(latest.at, now)}: "${latest.text}"` : ''}.`, evidence: '/services' });
    if (current.state === 'monitoring') unknowns.push('The open incident is monitoring: a fix is in place, and nobody has yet confirmed it holds.');
  }
  for (const i of data.alsoOpen ?? []) insights.push({ text: `Also open: "${i.title}" on ${i.service}, ${i.severity}, ${i.state}, started ${formatRelative(i.started, now)}.`, evidence: '/services' });
  const resolved = past.filter((i) => i.resolved);
  if (resolved.length) {
    const longest = resolved.reduce((m, i) => (Date.parse(i.resolved!) - Date.parse(i.started) > Date.parse(m.resolved!) - Date.parse(m.started) ? i : m));
    insights.push({ text: `${resolved.length} incident${resolved.length === 1 ? '' : 's'} resolved in the last 90 days; the longest, "${longest.title}" on ${formatDate(longest.started)}, lasted ${hours(longest.started, longest.resolved!)}.` });
  }
  unknowns.push('Latency is one reading per service, now; there is no latency history here to say whether it is unusual.');

  return { view: 'services', title: 'Services', address: '/services', scope: `every monitored service, now and the last ${days} days`, freshness: freshnessOf(data.updatedAt, data.now), facts, insights, unknowns };
}

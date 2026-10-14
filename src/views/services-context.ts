/**
 * Services' shared context (decision 0011): the console page, the MCP view and the console's assistant read the same
 * account of every service, its last 90 days and how long it has run, and of every incident, open and resolved, led by
 * the title the page is headed by and the days inside the band.
 */
import { facts as rules } from '@/app.config';
import { afterStart, type Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import type { DailyPoint } from '@/data/sample';
import { run, runOf, steady } from '@/lib/facts';
import { formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { handed, headInsights, inDays, type PageHead } from './fact-insight';

/**
 * What the page draws. `incidents` is every incident as the read hands it, newest first: those nobody has resolved,
 * then those resolved; null when the incidents could not be read, and the page and the context then say so while
 * every service stands. `head` is the page's title and the days inside the band, worked out on the server
 * (`servicesHead`).
 */
export type ServicesData = { services: Service[]; incidents: { open: Incident[]; resolved: Incident[] } | null; head: PageHead; updatedAt: string; now: string };

/** The one sentence under the page's title. It reads no data, so the loading state draws it too and the masthead does not move. */
export const SERVICES_LINE = 'Every service, how it is right now, and what happened in the last 90 days.';

/** The uptime the page states for its days: the mean of each service's own. */
const meanUptime = (services: readonly Pick<Service, 'uptime'>[]) => (services.length ? services.reduce((a, s) => a + s.uptime, 0) / services.length : 0);

/**
 * An uptime as the page, its title and its context write it: two decimals, except that a whole one reads "100%" and an
 * uptime under one never reads as a whole one, so one that would round to "100.00%" reads "99.99%".
 */
function formatUptime(uptime: number): string {
  if (uptime >= 1) return '100%';
  const said = formatPercent(uptime, 2);
  return said === formatPercent(1, 2) ? formatPercent(0.9999, 2) : said;
}

/** How long an incident lasted, or for one nobody has resolved how long it has lasted so far, in the product's durations. */
export function lastedOf(incident: Pick<Incident, 'started' | 'resolved'>, now: Date): string {
  return formatDuration((incident.resolved ? Date.parse(incident.resolved) : now.getTime()) - Date.parse(incident.started));
}

/**
 * Services' title, from plain figures: the uptime of its days, then the run of a service when one is named. `run` is
 * null when no service is on its longest run.
 */
export function servicesTitle({ uptime, days, run: held }: { uptime: number; days: number; run: { name: string; length: number } | null }): string {
  const said = `${formatUptime(uptime)} uptime in ${inDays(days)}`;
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

/** How long a service has run, in the Status list's words: the operational days that end today, from the days its strip draws. */
function runText(days: Service['days']): string {
  const today = days.at(-1);
  if (today === undefined) return 'no days kept';
  if (today !== 'operational') return today === 'outage' ? 'down today' : 'degraded today';
  const { length, reachesStart, longest } = runOf(days, 'operational');
  return `operational for ${reachesStart ? 'at least ' : ''}${length} ${plural(length, 'day')}${longest && !reachesStart ? `, its longest in ${days.length}` : ''}`;
}

export function servicesContext(data: ServicesData): SharedContext {
  const { services, incidents, head } = data;
  const now = new Date(data.now);
  const sum = summarise(services);
  const days = services[0]?.days.length ?? 0;
  const average = meanUptime(services);
  const apart = services.filter((s) => s.status !== 'operational');
  const facts: Fact[] = services.length ? [
    { label: 'Services now', value: `${sum.text}${apart.length ? ` (${apart.map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` },
    { label: `Uptime, all services, ${days} days`, value: formatUptime(average), definition: 'The average of each service\'s uptime, which is 1 less what its marked days cost: half an hour a degraded day, two hours a day of outage.' },
    // In the team's order, as the page lists them.
    ...services.map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)} now, uptime ${formatUptime(s.uptime)}, ${runText(s.days)}` })),
  ] : [];

  // The title first, as the page is headed, then the days inside the band: what the page states before what explains it.
  const insights: Insight[] = headInsights(head);
  const unknowns: string[] = head.unknown ? [head.unknown] : [];
  // Which service carries the history, beyond what the state now shows.
  const below = services.map((s) => ({ s, n: s.days.filter((d) => d !== 'operational').length })).sort((a, b) => b.n - a.n);
  const worstDays = services[0]?.days.map((_, i) => services.some((s) => s.days[i] !== 'operational')).filter(Boolean).length ?? 0;
  if (below[0]?.n) insights.push({ text: `${worstDays} of the last ${days} days had a service below operational; ${below[0].s.name} accounts for ${below[0].n} of them${below[1]?.n ? `, ${below[1].s.name} for ${below[1].n}` : ''}.`, evidence: '/services' });
  const lowest = services.reduce((m, s) => (s.uptime < m.uptime ? s : m), services[0]);
  if (lowest && lowest.uptime < average) insights.push({ text: `${lowest.name} has the lowest uptime, ${formatUptime(lowest.uptime)}, against ${formatUptime(average)} across all services.` });

  if (incidents) {
    // The open ones first, newest first, as the page lists them: who has each, where it is tracked, how long so far.
    for (const i of incidents.open) {
      const latest = i.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
      const who = [i.owner && `with ${i.owner}`, i.ticket && `tracked in "${i.ticket.title}"`].filter(Boolean).join(', ');
      insights.push({ text: `Open incident "${i.title}" on ${i.service}, ${i.severity}, ${i.state}${who ? `, ${who}` : ''}: open for ${lastedOf(i, now)} so far, since ${formatDateTime(i.started)} UTC${latest ? `; latest update ${afterStart(i.started, latest.at)}: "${latest.text}"` : ''}.`, evidence: '/services' });
    }
    if (!incidents.open.length) insights.push({ text: 'No incident is open.' });
    const { resolved } = incidents;
    if (resolved.length) insights.push({ text: `${resolved.length} ${plural(resolved.length, 'incident')} resolved, newest first: ${resolved.map((i) => `"${i.title}" on ${formatDate(i.started)}, lasted ${lastedOf(i, now)}`).join('; ')}.` });
    if (incidents.open.some((i) => i.state === 'monitoring')) unknowns.push('A monitoring incident has a fix in place that nobody has yet confirmed holds.');
  } else {
    unknowns.push('The incidents could not be read, so no incident is stated, open or resolved.');
  }
  unknowns.push('Latency is one reading per service, now; there is no latency history here to say whether it is unusual.');

  return { view: 'services', title: 'Services', address: '/services', scope: `every monitored service, now and the last ${days} days, and every incident`, freshness: freshnessOf(data.updatedAt, data.now), facts, insights, unknowns };
}

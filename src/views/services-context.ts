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

/**
 * How much of each list the context states, so it holds its budget however many services and incidents there are:
 * the first service lines in the team's order, the open incidents and the resolved ones newest first. Past each, it
 * says how many more there are. The page draws every one.
 */
const SERVICE_LINES = 6;
const OPEN_STATED = 2;
const RESOLVED_STATED = 3;
/** The services not operational a "Services now" line names before it counts the rest. */
const APART_NAMED = 1;

/** "1 service degraded (Inference API degraded)": the worst state, and the first service not operational named, the rest counted. */
export function servicesNow(services: Service[]): string {
  const apart = services.filter((s) => s.status !== 'operational');
  const named = apart.slice(0, APART_NAMED).map((s) => `${s.name} ${s.status}`);
  if (apart.length > APART_NAMED) named.push(`and ${apart.length - APART_NAMED} more`);
  return `${summarise(services).text}${named.length ? ` (${named.join(', ')})` : ''}`;
}

/** The open incidents past those a context states in full, counted: "And 4 more incidents open, 6 in all." */
export const moreOpen = (all: number, stated: number) => `And ${all - stated} more ${plural(all - stated, 'incident')} open, ${all} in all.`;

/** An update as a context quotes it: its first sentence, so one long update cannot crowd out the rest. */
const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

/** The uptime the page states for its days: the mean of each service's own. */
export const meanUptime = (services: readonly Pick<Service, 'uptime'>[]) => (services.length ? services.reduce((a, s) => a + s.uptime, 0) / services.length : 0);

/** The days the page counts: those of the longest strip. Every strip ends today, so a service that keeps fewer days keeps the latest of them. */
export const stripDays = (services: readonly Pick<Service, 'days'>[]) => Math.max(0, ...services.map((s) => s.days.length));

/** Each day of the longest strip, oldest first and the last today: the state of every service that keeps that day. */
function byDay(services: readonly Pick<Service, 'days'>[]): Service['days'][] {
  const n = stripDays(services);
  return Array.from({ length: n }, (_, i) => services.flatMap((s) => {
    const at = s.days.length - n + i;
    return at >= 0 ? [s.days[at]] : [];
  }));
}

/**
 * The share of the services operational on each day of the longest strip, oldest first, the last the day in progress:
 * the Featured metric's chart. A day a service does not keep counts it neither up nor down.
 */
export const operationalShare = (services: readonly Pick<Service, 'days'>[]) =>
  byDay(services).map((day) => day.filter((d) => d === 'operational').length / day.length);

/**
 * An uptime as the page, its title and its context write it: two decimals, except that a whole one reads "100%" and an
 * uptime under one never reads as a whole one, so one that would round to "100.00%" reads "99.99%".
 */
export function formatUptime(uptime: number): string {
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
 * The run the page states: that of the service whose current run is the longest, the team's order deciding a tie, when
 * it is that service's longest and does not reach the earliest day of its strip; null otherwise. The title names it,
 * and the Featured metric states its line as its finding.
 */
export function longestRun(services: readonly Pick<Service, 'name' | 'days'>[]): { name: string; length: number; text: string } | null {
  // The first in the team's order wins a tie, because a later one must be longer to replace it.
  const runs = services.map((s) => run(s.days, 'operational', { name: s.name }));
  const leader = runs.reduce<(typeof runs)[number]>((m, r) => (r && (!m || r.length > m.length) ? r : m), null);
  return leader?.longest ? { name: services[runs.indexOf(leader)].name, length: leader.length, text: leader.text } : null;
}

/**
 * What Services states at its head, worked out on the server. The title's uptime is the one the page states for the
 * services' days, and its run is the longest run (`longestRun`). After it, the days inside the band over every
 * complete day kept, with `facts.band`. `history` is those days, or null when they could not be read: the page is then
 * headed by the uptime alone and the context says so. A product with no service yet is headed by the page's name.
 */
export function servicesHead({ services, history }: { services: readonly Pick<Service, 'name' | 'uptime' | 'days'>[]; history: readonly DailyPoint[] | null }): PageHead {
  const held = history && steady(history, rules.band);
  const facts = held ? [handed(held, '/services')] : [];
  const unknown = history ? {} : { unknown: 'The days could not be read, so the title states the uptime alone and no day is counted inside the band.' };
  if (!services.length) return { title: null, facts, ...unknown };
  const named = history && longestRun(services);
  return { title: servicesTitle({ uptime: meanUptime(services), days: stripDays(services), run: named || null }), facts, ...unknown };
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
  const days = stripDays(services);
  const average = meanUptime(services);
  const unlisted = services.length - SERVICE_LINES;
  const facts: Fact[] = services.length ? [
    { label: 'Services now', value: servicesNow(services) },
    { label: `Uptime, all services, ${days} days`, value: formatUptime(average), definition: 'The average of each service\'s uptime, which is 1 less what its marked days cost: half an hour a degraded day, two hours a day of outage.' },
    // The first in the team's order, as the page lists them, then how many more.
    ...services.slice(0, SERVICE_LINES).map((s) => ({ label: s.name, value: `${s.status}, latency ${formatDuration(s.latency)} now, uptime ${formatUptime(s.uptime)}, ${runText(s.days)}` })),
    ...(unlisted > 0 ? [{ label: `${unlisted} more ${plural(unlisted, 'service')}`, value: `${services.length} in all` }] : []),
  ] : [];

  // The title first, as the page is headed, then the days inside the band: what the page states before what explains it.
  const insights: Insight[] = headInsights(head);
  const unknowns: string[] = head.unknown ? [head.unknown] : [];
  // Which service carries the history, beyond what the state now shows.
  const below = services.map((s) => ({ s, n: s.days.filter((d) => d !== 'operational').length })).sort((a, b) => b.n - a.n);
  const worstDays = byDay(services).filter((day) => day.some((d) => d !== 'operational')).length;
  if (below[0]?.n) insights.push({ text: `${worstDays} of the last ${days} days had a service below operational; ${below[0].s.name} accounts for ${below[0].n} of them${below[1]?.n ? `, ${below[1].s.name} for ${below[1].n}` : ''}.`, evidence: '/services' });
  const lowest = services.reduce((m, s) => (s.uptime < m.uptime ? s : m), services[0]);
  if (lowest && lowest.uptime < average) insights.push({ text: `${lowest.name} has the lowest uptime, ${formatUptime(lowest.uptime)}, against ${formatUptime(average)} across all services.` });

  if (incidents) {
    // The open ones first, newest first, as the page lists them: who has each, where it is tracked, how long so far, and
    // what its latest update says first. Past the first two they are counted.
    const { open, resolved } = incidents;
    for (const i of open.slice(0, OPEN_STATED)) {
      const latest = i.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
      const who = [i.owner && `with ${i.owner}`, i.ticket && `tracked in "${i.ticket.title}"`].filter(Boolean).join(', ');
      insights.push({ text: `Open incident "${i.title}" on ${i.service}, ${i.severity}, ${i.state}${who ? `, ${who}` : ''}: open for ${lastedOf(i, now)} so far, since ${formatDateTime(i.started)} UTC${latest ? `; latest update ${afterStart(i.started, latest.at)}: "${firstSentence(latest.text)}"` : ''}.`, evidence: '/services' });
    }
    if (open.length > OPEN_STATED) insights.push({ text: moreOpen(open.length, OPEN_STATED) });
    if (!open.length) insights.push({ text: 'No incident is open.' });
    const past = resolved.length - RESOLVED_STATED;
    if (resolved.length) insights.push({ text: `${resolved.length} ${plural(resolved.length, 'incident')} resolved, newest first: ${resolved.slice(0, RESOLVED_STATED).map((i) => `"${i.title}" on ${formatDate(i.started)}, lasted ${lastedOf(i, now)}`).join('; ')}${past > 0 ? `; and ${past} more resolved` : ''}.` });
    if (incidents.open.some((i) => i.state === 'monitoring')) unknowns.push('A monitoring incident has a fix in place that nobody has yet confirmed holds.');
  } else {
    unknowns.push('The incidents could not be read, so no incident is stated, open or resolved.');
  }
  unknowns.push('Latency is one reading per service, now; there is no latency history here to say whether it is unusual.');

  return { view: 'services', title: 'Services', address: '/services', scope: `every monitored service, now and the last ${days} days, and every incident`, freshness: freshnessOf(data.updatedAt, data.now), facts, insights, unknowns };
}

/**
 * Now's shared context (decision 0011): engineering as it is this moment, as both agents read it, led by the title the
 * page is headed by and the days inside the band. Each part's figures are worked out on the server (`nowData` in
 * `src/views/now-parts.ts`); this file only says them, so the page's client builds the same text from the same data.
 */
import { facts as rules } from '@/app.config';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/components/patterns/status-list/summarise';
import type { DayState } from '@/components/charts/uptime-bars';
import type { DailyPoint, Endpoint } from '@/data/sample';
import { steady } from '@/lib/facts';
import { formatCompact, formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { STATE, handed, headInsights, worst, type PageHead, type ServiceNow } from './fact-insight';

/** The window the month's figures, the models and the runs a day cover, in the words every label names it with. */
export const MONTH = 'last 30 complete days';

/** What two figures count, for the page's column heads and the agents alike: every other definition is in its card's line. */
export const NOW_METRICS = {
  p95: { label: 'p95, median day', hint: "A model's p95 is its median day's." },
  errors: { label: 'Errors, 5xx and 429', hint: 'Errors count responses with a 5xx or a 429.' },
} as const;

/** A model over the last 30 complete days: the route it serves, its requests, its p95 and time to first token on the median day, and its errors. */
export type NowModel = { id: string; label: string; serves: string; requests: number; p95: number; ttft: number | null; errors: number; errorRate: number };
/** A region on the latest complete day: the GPUs provisioned, the GPU-hours used and the share of the hours offered that were used. */
export type NowRegion = { region: string; gpus: number; used: number; share: number };
/** A ticket in play as Work lists it: its owner by name, whether it is the reader's own, and where the Tickets page finds it. */
export type NowTicket = { id: string; title: string; priority: 'high' | 'normal' | 'low'; state: 'open' | 'waiting'; owner: string | null; mine: boolean; href: string };
/** One of the month's four tiles: its figure, of how many when it counts a share, its line of at most 32 characters, and the one finding when it has it. */
export type NowTile = { label: string; value: number; of?: number; line: string; finding?: { text: string; day: string; tone: 'warning' } };
/** A fact of the days inside the band, by what it is about: the days outside by date, the year, p95 on the busiest day yet and the requests answered without an error. */
export type BandFact = { about: 'outside' | 'year' | 'busiest' | 'answered'; text: string };
/** A day's verification runs by how they ended. */
export type NowRunDay = { date: string; passed: number; skipped: number; failed: number };

/**
 * What Now's read hands the page, its embed and its context. `current` is the newest incident nobody has resolved, the
 * one the embed leads with, and `alsoOpen` every other one; `head` is the page's title and the days inside the band,
 * worked out on the server (`nowHead`). Each part's key is null when its read failed, and `unread` names it.
 */
export type NowData = {
  services: Service[];
  current: Incident | null;
  alsoOpen: Incident[];
  head: PageHead;
  /** The line under the title: how long after its start each update of the open incident came, the services and the days inside the band. */
  line: string | null;
  /** Every incident nobody has resolved, the most severe first and then the newest; and the latest one resolved, with its line, for the card that says none is open. */
  incidents: { open: Incident[]; latest: { incident: Incident; text: string } | null } | null;
  /**
   * The days inside the band: the last 360 complete days a state, ending on the latest (`end`), a day outside the band
   * marked; the steady count over every complete day kept; the share of the days shown inside it; and the four facts.
   */
  band: { days: DayState[]; end: string; inside: number; of: number; share: number; facts: BandFact[] } | null;
  models: NowModel[] | null;
  /** Compute in use on the latest complete day (`day`), a row a region, the fullest first. */
  compute: { day: string; regions: NowRegion[]; fullest: string | null } | null;
  /** The releases not yet out, in testing with what holds each and ready; the live version of each service; and the required checks passed of all over the releases not yet out. */
  shipping: {
    testing: { id: string; version: string; service: string; holds: string[] }[];
    ready: { id: string; version: string; service: string }[];
    live: { service: string; environment: string; version: string }[];
    checks: { passed: number; required: number };
  } | null;
  /** At most six tickets in play, in Work's order; how many more; and the address of every ticket. */
  work: { tickets: NowTicket[]; more: number; href: string } | null;
  /** Every endpoint, the slowest p95 first, over the 30 days the endpoints cover. */
  endpoints: Endpoint[] | null;
  /** The four figures of the last 30 complete days, each null when what it counts could not be read. */
  month: { releases: NowTile | null; tickets: NowTile | null; runs: NowTile | null; incidents: NowTile | null };
  /** The verification runs a day, the last 30 complete days and then the day in progress, which is still running. */
  runs: { days: NowRunDay[]; running: boolean } | null;
  /** The latest changes, newest first. */
  activity: ActivityEvent[] | null;
  /** What could not be read, in words: "the tickets". */
  unread: string[];
  updatedAt: string;
  now: string;
};

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

/** Items in a sentence: "a", "a and b", "a, b and c". */
export const inWords = (items: readonly string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? ''));

/** What a part says when its read failed, by the words `unread` names it with. */
const UNREAD: Record<string, string> = {
  'the services': 'no service is stated',
  'the incidents': 'no incident is stated, open or resolved',
  'the days': 'no day is counted inside the band',
  'the models': "no model's figures are stated",
  'the compute': 'compute in use is not stated',
  'the releases': 'what ships and the releases out are not stated',
  'the verification runs': 'the runs are not stated',
  'the tickets': 'the work and the tickets closed are not stated',
  'the endpoints': 'no endpoint is stated',
  'the changes': 'no change is stated',
};

export function nowContext(data: NowData): SharedContext {
  const { services, incidents, band, models, compute, shipping, work, endpoints, month, activity, head, updatedAt, now } = data;
  const at = new Date(now);
  const pct = (n: number) => formatPercent(n, 1);

  const facts: Fact[] = [];
  if (services.length) {
    const apart = services.filter((s) => s.status !== 'operational');
    facts.push({ label: 'Services now', value: `${summarise(services).text}${apart.length ? ` (${apart.map((s) => `${s.name} ${s.status}`).join(', ')})` : ''}` });
  }
  if (models) {
    facts.push({ label: `Models, ${MONTH}`, value: models.map((m) => `${m.label} ${formatCompact(m.requests)} requests, p95 ${formatDuration(m.p95)}`).join('; '), definition: NOW_METRICS.p95.hint });
  }
  if (compute?.regions.length) {
    const fullest = compute.regions.find((r) => r.region === compute.fullest) ?? compute.regions[0];
    const others = compute.regions.length - 1;
    facts.push({ label: `Compute in use, ${formatDate(compute.day)}`, value: `${fullest.region} ${pct(fullest.share)} of ${fullest.gpus} GPUs, the fullest${others ? `, and ${others} other ${plural(others, 'region')}` : ''}` });
  }
  if (shipping) {
    // By version: what holds each is on the page, in its line.
    const waiting = [
      shipping.testing.length && `${inWords(shipping.testing.map((r) => `${r.version} (${r.service})`))} in testing`,
      shipping.ready.length && `${inWords(shipping.ready.map((r) => `${r.version} (${r.service})`))} ready`,
    ].filter(Boolean);
    facts.push({ label: 'Shipping', value: `${waiting.length ? waiting.join('; ') : 'no release is waiting to go out'}; ${shipping.checks.passed} of ${shipping.checks.required} required checks passed; ${shipping.live.length} ${plural(shipping.live.length, 'version')} live` });
  }
  if (work) {
    const asked = work.tickets.filter((t) => t.priority === 'high' || !t.owner);
    const all = work.tickets.length + work.more;
    facts.push({ label: 'Work', value: `${all} ${plural(all, 'ticket')} open or waiting${asked.length ? `; high priority or nobody's: ${asked.map((t) => `${t.title} (${t.priority}, ${t.mine ? 'yours' : (t.owner ?? 'nobody')})`).join('; ')}` : ''}` });
  }
  if (endpoints?.length) {
    facts.push({ label: 'Slowest endpoints, p95 over 30 days', value: endpoints.slice(0, 3).map((e) => `${e.method} ${e.route} ${formatDuration(e.p95)}`).join('; ') });
  }
  const tiles = [month.releases, month.tickets, month.runs, month.incidents].filter((t): t is NowTile => t !== null);
  if (tiles.length) facts.push({ label: `The ${MONTH}`, value: tiles.map((t) => `${t.label} ${t.value}${t.of !== undefined ? ` of ${t.of}` : ''}, ${t.line}${t.finding ? ` (${t.finding.text})` : ''}`).join('; ') });
  if (activity) {
    const newest = activity[0];
    facts.push({ label: 'Changes', value: newest ? `${activity.length} latest; the newest ${formatRelative(newest.at, at)}: ${newest.actor}${newest.via ? ` via ${newest.via}` : ''} ${newest.verb} ${newest.object}` : 'none recorded' });
  }

  // The title first, as the page is headed, then the days inside the band: what the page states before what is open.
  const insights: Insight[] = headInsights(head);
  if (incidents) {
    if (incidents.open.length) {
      for (const i of incidents.open) {
        const latest = i.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
        const who = [i.owner && `with ${i.owner}`, i.ticket && `tracked in "${i.ticket.title}"`].filter(Boolean).join(', ');
        insights.push({ text: `Open incident "${i.title}" on ${i.service}, ${i.severity}, ${i.state}${who ? `, ${who}` : ''}: started ${formatRelative(i.started, at)}${latest ? `; latest update ${formatRelative(latest.at, at)}` : ''}.`, evidence: '/services' });
      }
    } else {
      insights.push({ text: `No incident is open${incidents.latest ? `; ${incidents.latest.text}` : ''}.` });
    }
  }
  // The days outside the band are named by the steady line above, so the band's other three facts follow it.
  if (band) for (const f of band.facts) if (f.about !== 'outside') insights.push({ text: `${f.text}.` });

  const unknowns: string[] = [];
  for (const name of data.unread) unknowns.push(`${name[0].toUpperCase()}${name.slice(1)} could not be read, so ${UNREAD[name] ?? 'what they state is missing'}.`);
  if (head.unknown) unknowns.push(head.unknown);
  if (incidents?.open.some((i) => i.state === 'monitoring')) unknowns.push('A monitoring incident has a fix in place that nobody has yet confirmed holds.');
  // The day in progress is in no figure above but the runs a day, where it is drawn as running.
  if (data.runs?.running) unknowns.push(`${formatDate(now)} is in progress and counted in no figure but the runs a day.`);

  return {
    view: 'now',
    title: 'Now',
    address: '/engineering',
    scope: `engineering now, and the ${MONTH} to ${formatDate(Date.parse(now) - 86_400_000)}`,
    freshness: freshnessOf(updatedAt, now),
    facts,
    insights,
    unknowns,
  };
}

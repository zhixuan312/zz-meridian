/**
 * Now's shared context (decision 0011): engineering as it is this moment, as both agents read it, led by the title the
 * page is headed by and the days inside the band. Each part's figures are worked out on the server (`nowData` in
 * `src/logic/now-parts.ts`); this file only says them, so the page's client builds the same text from the same data.
 */
import { facts as rules } from '@/app.config';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import type { Service } from '@/components/patterns/status-list';
import { packServices, unpackServices, type PackedService } from '@/logic/summarise';
import type { DayState } from '@/components/charts/uptime-bars';
import type { DailyPoint, Endpoint } from '@/data/sample';
import { runOf, steady } from '@/lib/facts';
import { formatCompact, formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate, formatDay, formatRelative } from '@/lib/format-date';
import { freshnessOf, type Fact, type Insight, type SharedContext } from '@/lib/shared-context';
import { STATE, handed, headInsights, worst, type PageHead, type ServiceNow } from './fact-insight';
import { moreOpen, servicesNow } from './services-context';

/** The window the month's figures, the models and the runs a day cover, in the words every label names it with. */
export const MONTH = 'last 30 complete days';

/** What two figures count, for the page's column heads and the agents alike: every other definition is in its card's line. */
export const NOW_METRICS = {
  p95: { label: 'p95, median day', hint: "A model's p95 is its median day's." },
  errors: { label: 'Errors, 5xx and 429', hint: 'Errors count responses with a 5xx or a 429.' },
} as const;

/** A model over the last 30 complete days: the route it serves, its requests, its p95 and time to first token on the median day, and its errors. */
export type NowModel = { id: string; label: string; serves: string; requests: number; p95: number | null; ttft: number | null; errors: number; errorRate: number | null };
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
 * What Now's read hands the page, its embed and its context. `head` is the page's title and the days inside the band,
 * worked out on the server (`nowHead`). Each part's key is null when its read failed, and `unread` names it.
 */
export type NowData = {
  services: Service[];
  head: PageHead;
  /** The line under the title: how long after its start each update of the open incident came, the services and the days inside the band. */
  line: string | null;
  /** Every incident nobody has resolved, the most severe first and then the newest; and the latest one resolved, with its line, for the card that says none is open. */
  incidents: { open: Incident[]; latest: { incident: Incident; text: string } | null } | null;
  /**
   * The days inside the band: the last 360 complete days a state, ending on the latest (`end`), a day outside the band
   * marked; each of those days' p95 in whole milliseconds, the Featured metric's chart; the steady count over every
   * complete day kept; the share of the days shown inside it; and the four facts.
   */
  band: { days: DayState[]; p95: number[]; end: string; inside: number; of: number; share: number; facts: BandFact[] } | null;
  models: NowModel[] | null;
  /** Compute in use on the latest complete day (`day`), a row a region, the fullest first. Null when its read failed, and then `unread` names it, or when it holds no complete day yet. */
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

/** Each part's title, as the page heads it: the band's is its figure ("357 of 360 days inside the band"), and this one heads it when the days could not be read. */
export const NOW_PARTS = {
  services: 'Services, now',
  incident: 'Open incident',
  incidents: 'Open incidents',
  band: 'Days inside the band',
  models: 'Models, now',
  compute: 'Compute in use',
  shipping: 'Shipping',
  work: 'Work',
  endpoints: 'Slowest endpoints',
  runs: 'Verification runs a day, by how they ended',
  changes: 'Changes',
} as const;
/** The month's four tiles by name, for a tile whose figure could not be read. */
export const NOW_TILES = { releases: 'Releases out', tickets: 'Tickets closed', runs: 'Runs passed', incidents: 'Incidents resolved' } as const;

/** The most services "Services, now" lists whole, and how many of the longest runs it keeps past that. */
export const SERVICES_WHOLE = 8;
const LONGEST_RUNS = 3;

/**
 * The services "Services, now" hands the Status list, which never folds: every one up to eight; past that, the ones
 * not operational in the team's order, then the three with the longest current runs, longest first. The link under
 * the list names how many there are and opens every one.
 */
export function servicesShown(services: Service[]): Service[] {
  if (services.length <= SERVICES_WHOLE) return services;
  const longest = services
    .filter((s) => s.status === 'operational')
    .map((s, order) => ({ s, order, run: runOf(s.days, 'operational').length }))
    .sort((a, b) => b.run - a.run || a.order - b.order)
    .slice(0, LONGEST_RUNS)
    .map((x) => x.s);
  return [...services.filter((s) => s.status !== 'operational'), ...longest];
}

/**
 * Nothing has arrived yet: every read answered, and none holds a record of any part (no service, no complete day, no
 * incident, no request of a model, no compute, no release, no ticket, no endpoint, no run and no change). A read that
 * failed is not this: its part says so and the rest stands.
 */
export function nothingArrived(d: NowData): boolean {
  const ships = d.shipping && (d.shipping.testing.length || d.shipping.ready.length || d.shipping.live.length);
  const ran = d.runs?.days.some((x) => x.passed + x.skipped + x.failed);
  const counted = Object.values(d.month).some((t) => t?.value);
  return !d.unread.length && !d.services.length && !d.band && !d.incidents?.open.length && !d.incidents?.latest && !d.models?.some((m) => m.requests)
    && !d.compute && !ships && !d.work?.tickets.length && !d.endpoints?.length && !ran && !counted && !d.activity?.length;
}

/** A day of the band's strip as one character, so the 360 days cross to the browser as one string, as the services' strips do. */
const DAY_GLYPH: Record<DayState, string> = { operational: 'o', degraded: 'd', outage: 'x', none: '-' };
const DAY_OF = Object.fromEntries(Object.entries(DAY_GLYPH).map(([state, glyph]) => [glyph, state])) as Record<string, DayState>;

type Band = NonNullable<NowData['band']>;
/** Now's body as it crosses to the browser: the strips one character a day. */
export type PackedNowData = Omit<NowData, 'services' | 'band'> & { services: PackedService[]; band: (Omit<Band, 'days'> & { days: string }) | null };

export function packNow({ services, band, ...rest }: NowData): PackedNowData {
  return { ...rest, services: packServices(services), band: band && { ...band, days: band.days.map((d) => DAY_GLYPH[d]).join('') } };
}

/** The inverse of `packNow`, in the client component that draws the strips. */
export function unpackNow({ services, band, ...rest }: PackedNowData): NowData {
  return { ...rest, services: unpackServices(services), band: band && { ...band, days: [...band.days].map((g) => DAY_OF[g]) } };
}

/**
 * How many of each list the context states before it counts the rest, so it holds its budget however much is in play:
 * the open incidents, the models, the releases in testing and those ready, and the tickets asked about. The page
 * draws every one.
 */
const STATED = { open: 1, models: 4, releases: 3, asked: 4 } as const;

/** Items in a sentence: "a", "a and b", "a, b and c". */
export const inWords = (items: readonly string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? ''));

/** What a part says when its read failed, by the words `unread` names it with. */
const UNREAD: Record<string, string> = {
  'the services': 'no service is stated',
  'the incidents': 'no incident is stated, open or resolved',
  'the days': 'no day is counted inside the band',
  'the usage': "no model's figures are stated",
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
  if (services.length) facts.push({ label: 'Services now', value: servicesNow(services) });
  if (models) {
    const named = models.slice(0, STATED.models).map((m) => `${m.label} ${formatCompact(m.requests)} requests, p95 ${formatDuration(m.p95)}`);
    if (models.length > STATED.models) named.push(`and ${models.length - STATED.models} more ${plural(models.length - STATED.models, 'model')}`);
    facts.push({ label: `Models, ${MONTH}`, value: named.join('; '), definition: NOW_METRICS.p95.hint });
  }
  if (compute?.regions.length) {
    const fullest = compute.regions.find((r) => r.region === compute.fullest) ?? compute.regions[0];
    const others = compute.regions.length - 1;
    facts.push({ label: `Compute in use, ${formatDate(compute.day)}`, value: `${fullest.region} ${pct(fullest.share)} of ${fullest.gpus} GPUs, the fullest${others ? `, and ${others} other ${plural(others, 'region')}` : ''}` });
  }
  if (shipping) {
    // By version, the first of each in the page's order and then how many more: what holds each is on the page, in its line.
    const versions = (rs: { version: string; service: string }[]) => inWords([
      ...rs.slice(0, STATED.releases).map((r) => `${r.version} (${r.service})`),
      ...(rs.length > STATED.releases ? [`${rs.length - STATED.releases} more`] : []),
    ]);
    const waiting = [
      shipping.testing.length && `${versions(shipping.testing)} in testing`,
      shipping.ready.length && `${versions(shipping.ready)} ready`,
    ].filter(Boolean);
    facts.push({ label: 'Shipping', value: `${waiting.length ? waiting.join('; ') : 'no release is waiting to go out'}; ${shipping.checks.passed} of ${shipping.checks.required} required checks passed; ${shipping.live.length} ${plural(shipping.live.length, 'version')} live` });
  }
  if (work) {
    const asked = work.tickets.filter((t) => t.priority === 'high' || !t.owner);
    const all = work.tickets.length + work.more;
    const named = asked.slice(0, STATED.asked).map((t) => `${t.title} (${t.priority}, ${t.mine ? 'yours' : (t.owner ?? 'nobody')})`);
    if (asked.length > STATED.asked) named.push(`and ${asked.length - STATED.asked} more`);
    facts.push({ label: 'Work', value: `${all} ${plural(all, 'ticket')} open or waiting${named.length ? `; high priority or nobody's: ${named.join('; ')}` : ''}` });
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
      // The first, the most severe and then the newest, in full; the rest counted, as the page's line counts them.
      for (const i of incidents.open.slice(0, STATED.open)) {
        const latest = i.updates.reduce<Incident['updates'][number] | undefined>((m, u) => (!m || u.at > m.at ? u : m), undefined);
        const who = [i.owner && `with ${i.owner}`, i.ticket && `tracked in "${i.ticket.title}"`].filter(Boolean).join(', ');
        insights.push({ text: `Open incident "${i.title}" on ${i.service}, ${i.severity}, ${i.state}${who ? `, ${who}` : ''}: started ${formatRelative(i.started, at)}${latest ? `; latest update ${formatRelative(latest.at, at)}` : ''}.`, evidence: '/services' });
      }
      if (incidents.open.length > STATED.open) insights.push({ text: moreOpen(incidents.open.length, STATED.open) });
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
  if (data.runs?.running) unknowns.push(`${formatDay(now)} is in progress and counted in no figure but the runs a day.`);

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

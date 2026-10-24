/**
 * What Now states, worked out on the server from what its read could read: the line under the title and each part's
 * figures, lines and points (`NowData`). Pure: it is handed rows and returns figures, so the read in
 * `src/views/tools.ts` and a test build Now the same way, and no row reaches the browser.
 *
 * A read that failed is handed as null: its part is null, `unread` names it, and the rest stands. The day in progress
 * is counted in nothing but the runs a day, which draw it as running.
 */
import { facts as rules, workspaces } from '@/app.config';
import type { ActivityEvent } from '@/components/patterns/activity-feed';
import type { Incident } from '@/components/patterns/incident-card';
import { afterStart } from '@/logic/after-start';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/logic/summarise';
import type { ReleaseRow, RunRow } from '@/data/engineering';
import { ticketAddress } from '@/data/metrics';
import type { ComputeRow, DailyPoint, Endpoint, Model, UsageRow } from '@/data/sample';
import type { TicketRow } from '@/data/tickets';
import { steady } from '@/lib/facts';
import { formatDuration, plural } from '@/lib/format';
import { dayOf, formatDate, formatDay } from '@/lib/format-date';
import { PERIOD_DAYS } from '@/lib/period';
import { yearFacts, yearLine } from './home-parts';
import { inWords, NOW_TILES, nowHead, type BandFact, type NowData, type NowModel, type NowRunDay, type NowTicket } from './now-context';
import { releaseFigures, releaseMoment, stageOf, unresolvedText } from './releases-context';

/** The days a strip of the band shows, the window the month's figures count, the tickets Work lists and the longest line a tile draws. */
const STRIP_DAYS = 360;
const WINDOW_DAYS = 30;
const WORK_SHOWN = 6;
const TILE_LINE = 32;
/**
 * The characters the line under the title may take: the lead's room (`LeadRoom` in
 * `src/components/patterns/page-loading`, about 220 characters) less who Engineering is for and the ". " the page
 * writes between them.
 */
const LINE_ROOM = 220 - 2 - workspaces.engineering.audience.length;

const DAY = 86_400_000;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
/** The lower of the two middle values, as a period's median day is chosen (`totalsOf`): always a value that was recorded. */
const lowerMedian = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
/** A tile's line, or its shorter form when the line would not fit the tile. */
const fit = (line: string, shorter: string) => (line.length <= TILE_LINE ? line : shorter);
const SEVERITY = { major: 0, minor: 1 } as const;

/** What Now's read could read, each null when its read failed. `reader` is who is reading, by the id their tickets are assigned with. */
export type NowReads = {
  services: Service[] | null;
  /** Every incident, newest first, each with its ticket where it could be read. */
  incidents: Incident[] | null;
  releases: ReleaseRow[] | null;
  runs: RunRow[] | null;
  /** Every complete day kept, oldest first. */
  history: DailyPoint[] | null;
  usage: UsageRow[] | null;
  models: Model[] | null;
  compute: ComputeRow[] | null;
  endpoints: Endpoint[] | null;
  tickets: TicketRow[] | null;
  activity: ActivityEvent[] | null;
  reader: string;
  updatedAt: string;
  now: string;
};

/** The facts of the days inside the band, each a line: the days outside by date, the year, p95 on the busiest day yet and the requests answered without an error. */
function bandFacts(history: readonly DailyPoint[], outside: readonly string[]): BandFact[] {
  const out: BandFact[] = [];
  if (outside.length) out.push({ about: 'outside', text: `Outside the band on ${inWords(outside.map(formatDate))}` });
  // The year and the total are written by the functions Home writes them with, so the two pages state one line.
  const year = yearLine(history, PERIOD_DAYS['30d']!);
  if (year) out.push({ about: 'year', text: year });
  const busiest = history.reduce((m, d) => (d.requests > m.requests ? d : m));
  out.push({ about: 'busiest', text: `p95 was ${Math.round(busiest.p95)} ms on the busiest day yet, ${formatDate(busiest.date)}` });
  const answered = yearFacts(history).find((f) => f.kind === 'total');
  if (answered) out.push({ about: 'answered', text: answered.text });
  return out;
}

/** Work's order: high priority first, then what nobody owns, then the rest, the newest opened first inside each. */
const workRank = (t: TicketRow) => (t.priority === 'high' ? 0 : !t.assignee ? 1 : 2);

/** Now's data from what its read could read. */
export function nowData(r: NowReads): NowData {
  const unread: string[] = [];
  const read = <T>(value: T | null, name: string): value is T => {
    if (value === null) unread.push(name);
    return value !== null;
  };
  const today = dayOf(r.now);
  // The month: the 30 complete days that end yesterday, by their dates.
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - WINDOW_DAYS * DAY).toISOString().slice(0, 10);
  const inMonth = (at: string | null | undefined) => !!at && dayOf(at) >= from && dayOf(at) < today;

  const services = read(r.services, 'the services') ? r.services : [];
  const incidentsRead = read(r.incidents, 'the incidents');
  const all = incidentsRead ? r.incidents! : [];
  const open = all.filter((i) => i.state !== 'resolved');
  const resolved = all.filter((i) => i.state === 'resolved' && i.resolved).sort((a, b) => (a.resolved! < b.resolved! ? 1 : -1));
  const length = (i: Incident) => Date.parse(i.resolved!) - Date.parse(i.started);
  const lasted = (i: Incident) => formatDuration(length(i));
  const latest = resolved[0] ?? null;
  const releases = read(r.releases, 'the releases') ? r.releases : null;
  const history = read(r.history, 'the days') ? r.history : null;
  const held = history?.length ? steady(history, rules.band) : null;

  // The line under the title: the most severe open incident's updates timed from its start, in the card's words. The
  // title names the service and the card the incident, so the line does not. It shares the lead's room with who
  // Engineering is for, so it takes the fullest form that fits: every update, then the updates counted and the latest
  // named, then the incidents counted; then without the band, which the Featured metric under it states.
  const lead = [...open].sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity] || (a.started < b.started ? 1 : -1));
  const times = lead[0] ? [...lead[0].updates].sort((a, b) => a.at.localeCompare(b.at)).map((u) => afterStart(lead[0].started, u.at)) : [];
  const others = lead.length > 2 ? `, and ${lead.length - 1} more incidents open` : lead.length > 1 ? ', and another incident open' : '';
  const incident = lead.length ? [
    ...(times.length ? [`Updates ${inWords(times)}${others}`] : []),
    ...(times.length > 1 ? [`${times.length} updates, the latest ${times.at(-1)}${others}`] : []),
    `${lead.length} ${plural(lead.length, 'incident')} open`,
  ] : [null];
  const state = services.length ? summarise(services).text : null;
  const inBand = held && `${held.inside} of ${held.of} days inside the band`;
  const shortest = incident.at(-1) ?? null;
  const line = [...incident.map((i) => [i, state, inBand]), [shortest, state], [shortest]]
    .map((clauses) => clauses.filter(Boolean).join('; '))
    .find((l, i, all) => l.length <= LINE_ROOM || i === all.length - 1)!;

  let band: NowData['band'] = null;
  if (history?.length && held) {
    const shown = history.slice(-STRIP_DAYS);
    const out = new Set(held.outside);
    const inside = shown.filter((d) => !out.has(d.date)).length;
    band = {
      days: shown.map((d) => (out.has(d.date) ? 'degraded' : 'operational')),
      // Whole milliseconds: 360 of them cross to the browser, and the chart reads no finer.
      p95: shown.map((d) => Math.round(d.p95)),
      end: shown.at(-1)!.date, inside: held.inside, of: held.of, share: inside / shown.length, facts: bandFacts(history, held.outside),
    };
  }

  let models: NowData['models'] = null;
  // A model's figures need its rows and its label: either read failing leaves the part unread, and each that failed is named.
  const usage = read(r.usage, 'the usage') ? r.usage : null;
  if (read(r.models, 'the models') && usage) {
    const dates = [...new Set(usage.map((u) => u.date).filter((d) => d < today))].sort().slice(-WINDOW_DAYS);
    const kept = new Set(dates);
    models = r.models.map((m): NowModel => {
      const days = usage.filter((u) => u.model === m.id && kept.has(u.date));
      const requests = sum(days.map((d) => d.requests)), errors = sum(days.map((d) => d.errors));
      const ttft = days.flatMap((d) => (d.ttft === null ? [] : [d.ttft]));
      // A model with no row in the window answered nothing: its requests are none. Its p95 and its error share were
      // never measured, and 0ms and 0.00% are claims nobody took — the same zero-for-missing the request log had.
      return { id: m.id, label: m.label, serves: m.serves, requests, p95: days.length ? lowerMedian(days.map((d) => d.p95)) : null, ttft: ttft.length ? lowerMedian(ttft) : null, errors, errorRate: requests ? errors / requests : null };
    }).sort((a, b) => b.requests - a.requests);
  }

  // Read, and holding no day before today, the compute is null and not unread: the part says none is recorded yet.
  let compute: NowData['compute'] = null;
  if (read(r.compute, 'the compute')) {
    const day = r.compute.map((c) => c.date).filter((d) => d < today).sort().at(-1);
    if (day) {
      const regions = r.compute.filter((c) => c.date === day).map((c) => ({ region: c.region, gpus: c.gpus, used: c.used, share: c.gpus ? c.used / (c.gpus * 24) : 0 })).sort((a, b) => b.share - a.share);
      compute = { day, regions, fullest: regions[0]?.region ?? null };
    }
  }

  let shipping: NowData['shipping'] = null;
  if (releases) {
    const waiting = releases.filter((x) => stageOf(x) !== 'released').sort((a, b) => (releaseMoment(a) < releaseMoment(b) ? 1 : -1));
    shipping = {
      testing: waiting.filter((x) => stageOf(x) === 'testing').map((x) => ({ id: x.id, version: x.version, service: x.service, holds: x.verification.unresolved.map(unresolvedText) })),
      ready: waiting.filter((x) => stageOf(x) === 'ready').map((x) => ({ id: x.id, version: x.version, service: x.service })),
      live: releaseFigures(releases).live.map((x) => ({ service: x.service, environment: x.environment, version: x.version })),
      checks: { passed: sum(waiting.map((x) => x.verification.passed)), required: sum(waiting.map((x) => x.verification.required)) },
    };
  }

  const tickets = read(r.tickets, 'the tickets') ? r.tickets : null;
  let work: NowData['work'] = null;
  if (tickets) {
    const inPlay = tickets.filter((t) => t.state !== 'closed').sort((a, b) => workRank(a) - workRank(b) || (a.openedAt < b.openedAt ? 1 : -1));
    work = {
      tickets: inPlay.slice(0, WORK_SHOWN).map((t): NowTicket => ({ id: t.id, title: t.title, priority: t.priority, state: t.state as NowTicket['state'], owner: t.assignee, mine: t.assigneeId === r.reader, href: ticketAddress(t.title) })),
      more: Math.max(0, inPlay.length - WORK_SHOWN),
      href: '/operations-tickets',
    };
  }

  const endpoints = read(r.endpoints, 'the endpoints') ? [...r.endpoints].sort((a, b) => b.p95 - a.p95) : null;
  const runs = read(r.runs, 'the verification runs') ? r.runs : null;
  const activity = read(r.activity, 'the changes') ? [...r.activity].sort((a, b) => (a.at < b.at ? 1 : -1)) : null;

  // The month's four tiles, each from what it counts; a tile whose read failed is null and the others stand.
  const out = releases?.filter((x) => inMonth(x.releasedAt)).sort((a, b) => (a.releasedAt! < b.releasedAt! ? 1 : -1)) ?? null;
  const closed = tickets?.filter((t) => inMonth(t.closedAt)).map((t) => Math.round((Date.parse(t.closedAt!) - Date.parse(t.openedAt)) / DAY)).sort((a, b) => a - b) ?? null;
  const ran = runs?.filter((x) => inMonth(x.startedAt)) ?? null;
  const failed = ran?.filter((x) => x.state === 'failed').sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0];
  const settled = incidentsRead ? resolved.filter((i) => inMonth(i.resolved)) : null;
  const month: NowData['month'] = {
    releases: out && { label: NOW_TILES.releases, value: out.length, line: out.length ? fit(`the latest ${out[0].version} on ${formatDay(out[0].releasedAt!)}`, `the latest on ${formatDay(out[0].releasedAt!)}`) : 'none went out' },
    tickets: closed && { label: NOW_TILES.tickets, value: closed.length, line: closed.length ? fit(`took ${inWords(closed.map(String))} ${closed.at(-1) === 1 ? 'day' : 'days'}`, `took ${closed[0]} to ${closed.at(-1)} days`) : 'none closed' },
    runs: ran && {
      label: NOW_TILES.runs, value: ran.filter((x) => x.state === 'passed').length, of: ran.length,
      line: `${ran.filter((x) => x.state === 'failed').length} failed, ${ran.filter((x) => x.state === 'skipped').length} skipped`,
      ...(failed ? { finding: { text: fit(`${failed.suite} run failed ${formatDay(failed.startedAt)}`, `a run failed ${formatDay(failed.startedAt)}`), day: dayOf(failed.startedAt), tone: 'warning' as const } } : {}),
    },
    incidents: settled && {
      label: NOW_TILES.incidents, value: settled.length,
      line: settled.length ? fit(`lasted ${inWords(settled.map(lasted))}`, `the longest lasted ${formatDuration(Math.max(...settled.map(length)))}`) : latest ? `last ${formatDate(latest.resolved!)}, lasted ${lasted(latest)}` : 'none resolved yet',
    },
  };

  let runsADay: NowData['runs'] = null;
  if (runs) {
    const days: NowRunDay[] = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * DAY).toISOString().slice(0, 10), passed: 0, skipped: 0, failed: 0 }));
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const x of runs) {
      const d = byDate.get(dayOf(x.startedAt));
      if (d) d[x.state] += 1;
    }
    runsADay = { days, running: true };
  }

  return {
    services,
    head: nowHead({ services, testing: releases && releaseFigures(releases).testing, history }),
    line: line || null,
    incidents: incidentsRead ? { open: lead, latest: latest && { incident: latest, text: `the last was resolved on ${formatDate(latest.resolved!)} and lasted ${lasted(latest)}` } } : null,
    band,
    models,
    compute,
    shipping,
    work,
    endpoints,
    month,
    runs: runsADay,
    activity,
    unread,
    updatedAt: r.updatedAt,
    now: r.now,
  };
}

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { ShareContext } from '@/components/base/use-share-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusDot } from '@/components/ui/status-dot';
import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { Meridian } from '@/components/charts/meridian';
import { UptimeBars } from '@/components/charts/uptime-bars';
import { ActivityFeed } from '@/components/patterns/activity-feed';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { IncidentCard } from '@/components/patterns/incident-card';
import { MetricTile } from '@/components/patterns/metric-tile';
import { StatusList } from '@/components/patterns/status-list';
import type { Endpoint } from '@/data/sample';
import { formatCompact, formatDuration, formatPercent, plural } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/cn';
import { useLive } from '@/lib/live';
import {
  MONTH, NOW_METRICS, NOW_PARTS as P, NOW_TILES, nothingArrived, nowContext, servicesShown, unpackNow,
  type NowData, type NowModel, type NowTile, type PackedNowData,
} from './now-context';
import { Unread, unreadTile } from './unread';

const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';
/** "02 Oct": a day's label under its column. */
const short = (date: string) => formatDate(date).replace(/ \d{4}$/, '');
const RUN_PARTS = [
  { key: 'passed', label: 'Passed', tone: 'neutral' },
  { key: 'skipped', label: 'Skipped', tone: 'warning' },
  { key: 'failed', label: 'Failed', tone: 'critical' },
] as const;
const PRIORITY = { high: 'High', normal: 'Normal', low: 'Low' } as const;

/** Services, now: every service with its run, or past eight the ones not operational and the three longest runs; always the way to every one. */
function Services({ data, end }: { data: NowData; end: Date }) {
  const { services } = data;
  const all = (
    <Link href="/services" className={linkClass}>
      All {services.length} {plural(services.length, 'service')} <ArrowRight className="size-3.5" />
    </Link>
  );
  if (!services.length) {
    return (
      <Card>
        <CardHeader title={P.services} />
        <CardBody>
          <EmptyState layout="inline" title="No service is monitored yet">Every service you monitor appears here with its state now and how long it has run.</EmptyState>
        </CardBody>
      </Card>
    );
  }
  const shown = servicesShown(services);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={P.services}
        description={shown.length < services.length ? 'The services not operational, then the three that have run longest' : 'State now, the last 90 days and how long each has run'}
        actions={all}
        divided
      />
      <StatusList services={shown} end={end} run />
    </Card>
  );
}

/**
 * The open incident, its updates timed from its start, its owner and its ticket; several are one list, the most
 * severe first; with none the part stays and says when the last one was resolved and how long it lasted. The card is
 * a card of its own, so the part's title stands above it.
 */
function Incidents({ incidents, end }: { incidents: NonNullable<NowData['incidents']>; end: Date }) {
  const { open, latest } = incidents;
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h2 id={id} className="t-card">{open.length > 1 ? P.incidents : P.incident}</h2>
      {open.length ? (
        open.map((i) => <IncidentCard key={i.id} incident={i} now={end} />)
      ) : (
        <Card className="flex-1">
          <CardBody className="pt-(--card-pad)">
            <p className="flex items-start gap-2.5 text-sm text-ink-2">
              <StatusDot tone="positive" className="mt-[0.45em]" />
              <span className="text-pretty">No incident is open{latest ? `; ${latest.text}` : ''}.</span>
            </p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}

/** N of M days inside the band: the last 360 complete days, a mark for each day outside it, then its four facts. */
function Band({ band }: { band: NonNullable<NowData['band']> }) {
  return (
    <Card>
      <CardHeader title={`${band.inside} of ${band.of} days inside the band`} wrap description={`The last ${band.days.length} complete days to ${formatDate(band.end)}, a mark for each day outside the band`} />
      <CardBody className="flex flex-col gap-5">
        <UptimeBars days={band.days} uptime={band.share} end={new Date(band.end)} endLabel={formatDate(band.end)} label={`Days inside the band, the last ${band.days.length} complete days`} measure="inside the band" size="lg" />
        {band.facts.length ? (
          <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {band.facts.map((f) => (
              <li key={f.about} className="flex min-w-0 items-start gap-2.5 text-sm">
                <StatusDot tone="neutral" className="mt-[0.45em]" />
                <span className="min-w-0 text-pretty text-ink-2">{f.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}

const MODEL_COLUMNS: Column<NowModel>[] = [
  // What the model serves is its second line, not a column: the table stands in two thirds of the page, and a sixth
  // column cut the errors off at 1440px.
  {
    key: 'model', header: 'Model', grow: true, mobile: 'title', title: (m) => `${m.label}, ${m.serves}`, mobileCell: (m) => m.label,
    cell: (m) => <><span className="block truncate">{m.label}</span><span className="t-caption block truncate font-mono">{m.serves}</span></>,
  },
  { key: 'requests', header: 'Requests', numeric: true, mobile: 'fact', cell: (m) => formatCompact(m.requests), mobileCell: (m) => `${formatCompact(m.requests)} requests` },
  { key: 'p95', header: NOW_METRICS.p95.label, numeric: true, mobile: 'fact', cell: (m) => formatDuration(m.p95), mobileCell: (m) => `p95 ${formatDuration(m.p95)}` },
  { key: 'ttft', header: 'First token', numeric: true, muted: true, hideBelow: 'md', cell: (m) => formatDuration(m.ttft), title: (m) => (m.ttft === null ? 'No first token: the model streams none' : `${formatDuration(m.ttft)} to the first token on the median day`) },
  { key: 'errors', header: NOW_METRICS.errors.label, numeric: true, mobile: 'fact', cell: (m) => `${formatCompact(m.errors)} · ${formatPercent(m.errorRate, 2)}`, mobileCell: (m) => `${formatPercent(m.errorRate, 2)} errors` },
];

/** Models, now: a row a model over the last 30 complete days, its columns named for their windows. */
function Models({ models }: { models: NonNullable<NowData['models']> }) {
  return (
    <DataTable
      title={P.models}
      description={`Each model over the ${MONTH}, the most requested first`}
      caption={`Each model over the ${MONTH}`}
      noun="models"
      rows={models}
      columns={MODEL_COLUMNS}
      rowKey={(m) => m.id}
      pageSize={Math.max(1, models.length)}
      pageSizes={[Math.max(1, models.length)]}
      empty={{ title: 'No model has answered a request yet' }}
    />
  );
}

/** Compute in use on the latest complete day: a row a region, the fullest highlighted, each with the GPUs provisioned. */
function Compute({ compute }: { compute: NonNullable<NowData['compute']> }) {
  return (
    <Card>
      <CardHeader title={P.compute} description={`GPU-hours used of those provisioned, ${formatDate(compute.day)}`} />
      <CardBody>
        <BarList
          label={`Compute in use by region, ${formatDate(compute.day)}`}
          total={1}
          format={(n) => formatPercent(n, 1)}
          highlight={compute.fullest ?? undefined}
          items={compute.regions.map((r) => ({ key: r.region, label: <span className="font-mono text-xs">{r.region}</span>, value: r.share, meta: `${r.gpus} GPUs provisioned` }))}
        />
      </CardBody>
    </Card>
  );
}

/** Shipping: the releases in testing with what holds each, the ready ones, the live versions and the required checks counted. */
function Shipping({ shipping }: { shipping: NonNullable<NowData['shipping']> }) {
  const { testing, ready, live, checks } = shipping;
  const group = 't-eyebrow mb-2';
  return (
    <Card>
      <CardHeader title={P.shipping} description={`${checks.passed} of ${checks.required} required checks passed over the releases not yet out`} />
      <CardBody className="flex flex-col gap-5">
        <div>
          <p className={group}>In testing · {testing.length}</p>
          {testing.length ? (
            <ul className="flex flex-col">
              {testing.map((r) => (
                <li key={r.id} className="border-b border-line py-2.5 last:border-0">
                  <p className="flex items-center gap-2 text-sm"><StatusDot tone="warning" /><span className="t-num font-medium text-ink">{r.version}</span><span className="text-ink-2">{r.service}</span></p>
                  {r.holds.length ? <p className="t-caption mt-0.5 pl-[18px] text-pretty">Held by {r.holds.join('; ')}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-2">No release is in testing.</p>}
        </div>
        <div>
          <p className={group}>Ready · {ready.length}</p>
          {ready.length ? (
            <ul className="flex flex-col">
              {ready.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm"><StatusDot tone="positive" /><span className="t-num font-medium text-ink">{r.version}</span><span className="text-ink-2">{r.service}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-2">No release has passed every required check.</p>}
        </div>
        <div>
          <p className={group}>Live · {live.length}</p>
          {live.length ? (
            <ul className="flex flex-col">
              {live.map((r) => (
                <li key={`${r.service}:${r.environment}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 text-ink-2">{r.service}</span>
                  <span className="t-num shrink-0 font-medium text-ink">{r.version}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-2">No version is live yet.</p>}
        </div>
      </CardBody>
      <CardFooter>
        <Link href="/releases" className={linkClass}>Every release <ArrowRight className="size-3.5" /></Link>
      </CardFooter>
    </Card>
  );
}

/** Work: the tickets in play, high priority first and then those nobody owns, the reader's own marked, and the way to all. */
function Work({ work }: { work: NonNullable<NowData['work']> }) {
  return (
    <Card>
      <CardHeader title={P.work} description="Open and waiting tickets: high priority first, then those nobody owns" />
      <CardBody>
        {work.tickets.length ? (
          <ul className="flex flex-col">
            {work.tickets.map((t) => (
              <li key={t.id} className="border-b border-line py-2.5 last:border-0">
                <p className="flex min-w-0 items-start gap-2">
                  <Link href={t.href} className="row-link hit min-w-0 text-sm font-medium text-pretty text-ink hover:text-accent-ink">{t.title}</Link>
                  {t.mine ? <Badge tone="accent" className="ml-auto shrink-0">Yours</Badge> : null}
                </p>
                <p className="t-caption mt-0.5">{PRIORITY[t.priority]} priority · {t.state === 'waiting' ? 'Waiting' : 'Open'} · {t.owner ?? 'Nobody owns it'}</p>
              </li>
            ))}
          </ul>
        ) : <p className="py-2 text-sm text-ink-2">No ticket is open or waiting.</p>}
      </CardBody>
      <CardFooter>
        {work.more ? <span className="t-caption">{work.more} more open or waiting</span> : null}
        <Link href={work.href} className={cn(linkClass, 'ml-auto')}>All tickets <ArrowRight className="size-3.5" /></Link>
      </CardFooter>
    </Card>
  );
}

const ENDPOINT_COLUMNS: Column<Endpoint>[] = [
  { key: 'endpoint', header: 'Endpoint', grow: true, truncate: true, mobile: 'title', cell: (e) => <span className="font-mono text-xs"><span className="text-ink-3">{e.method}</span> {e.route}</span>, title: (e) => `${e.method} ${e.route}` },
  { key: 'p95', header: 'p95', numeric: true, mobile: 'fact', cell: (e) => formatDuration(e.p95), mobileCell: (e) => `p95 ${formatDuration(e.p95)}` },
  { key: 'requests', header: 'Requests', numeric: true, mobile: 'fact', cell: (e) => formatCompact(e.requests), mobileCell: (e) => `${formatCompact(e.requests)} requests` },
  { key: 'errors', header: 'Error rate', numeric: true, mobile: 'fact', cell: (e) => formatPercent(e.errorRate, 2), mobileCell: (e) => `${formatPercent(e.errorRate, 2)} errors` },
];

/** Slowest endpoints: every endpoint by p95, the slowest first, over the 30 days the endpoints cover. */
function Endpoints({ endpoints }: { endpoints: NonNullable<NowData['endpoints']> }) {
  return (
    <DataTable
      title={P.endpoints}
      description="Each endpoint by p95 over the last 30 days, the slowest first"
      caption="Each endpoint by p95, the slowest first"
      noun="endpoints"
      rows={endpoints}
      columns={ENDPOINT_COLUMNS}
      rowKey={(e) => `${e.method} ${e.route}`}
      pageSize={Math.max(1, endpoints.length)}
      pageSizes={[Math.max(1, endpoints.length)]}
      empty={{ title: 'No endpoint has been called yet' }}
    />
  );
}

/** One of the month's four tiles: its figure, of how many when it counts a share, its line, and the one finding. */
function Tile({ tile }: { tile: NowTile }) {
  return <MetricTile label={tile.label} value={tile.value} note={tile.of !== undefined ? `of ${tile.of} · ${tile.line}` : tile.line} finding={tile.finding} />;
}

/** The verification runs a day by how they ended, the last 30 complete days and today so far. */
function Runs({ runs }: { runs: NonNullable<NowData['runs']> }) {
  return (
    <Card>
      <CardHeader title={P.runs} wrap description={`The ${MONTH}${runs.running ? ', and today so far' : ''}, UTC`} />
      <CardBody>
        <ColumnChart
          label="Verification runs a day, by how they ended"
          parts={RUN_PARTS.map((p) => ({ ...p }))}
          columns={runs.days.map((d) => ({ key: d.date, label: short(d.date), values: [d.passed, d.skipped, d.failed] }))}
          dates={runs.days.map((d) => d.date)}
          running={runs.running}
          format={(n) => formatCompact(n)}
          height={200}
        />
      </CardBody>
    </Card>
  );
}

/** Changes: the latest events, newest first, kept live by the page. */
function Changes({ events, end }: { events: NonNullable<NowData['activity']>; end: Date }) {
  return (
    <Card>
      <CardHeader title={P.changes} description="Newest first, as they happen" />
      <CardBody>
        {events.length ? <ActivityFeed events={events} now={end} /> : <p className="py-2 text-sm text-ink-2">No change is recorded yet.</p>}
      </CardBody>
    </Card>
  );
}

/**
 * Now's body: twelve parts, in order, the head being the page frame's. Each part draws what the read handed it and
 * works nothing out; a part whose read failed says so in its own place, and the rest stands. With nothing arrived yet
 * one card says so and no part is drawn. The changes are kept live: a change the product records redraws the page.
 * The embed's fullscreen view draws it too.
 */
export function NowBody(data: NowData) {
  useLive(['activity']);
  const end = new Date(data.now);
  if (nothingArrived(data)) {
    return (
      <Stack>
        <ShareContext context={nowContext(data)} />
        <Card>
          <EmptyState title="No services yet" className="py-16">
            The services, their incidents and what ships appear here once the first service is monitored.
          </EmptyState>
        </Card>
      </Stack>
    );
  }
  const { incidents, band, models, compute, shipping, work, endpoints, month, runs, activity } = data;
  return (
    <Stack>
      <ShareContext context={nowContext(data)} />
      <Row split="2/3">
        <Services data={data} end={end} />
        {incidents ? <Incidents incidents={incidents} end={end} /> : <Unread title={P.incident} what="the incidents" />}
      </Row>
      {band ? <Band band={band} /> : <Unread title={P.band} what="the days" />}
      <Row split="2/3">
        {models ? <Models models={models} /> : <Unread title={P.models} what="the models" />}
        {compute ? <Compute compute={compute} /> : <Unread title={P.compute} what="the compute" />}
      </Row>
      <Row split="1/2">
        {shipping ? <Shipping shipping={shipping} /> : <Unread title={P.shipping} what="the releases" />}
        {work ? <Work work={work} /> : <Unread title={P.work} what="the tickets" />}
      </Row>
      {endpoints ? <Endpoints endpoints={endpoints} /> : <Unread title={P.endpoints} what="the endpoints" />}
      {/* The tiles and the runs a day share the runs' days: the failed run's finding points the chart at its day. */}
      <Meridian dates={runs ? runs.days.map((d) => d.date) : []}>
        <Row split="tiles">
          {month.releases ? <Tile tile={month.releases} /> : unreadTile(NOW_TILES.releases)}
          {month.tickets ? <Tile tile={month.tickets} /> : unreadTile(NOW_TILES.tickets)}
          {month.runs ? <Tile tile={month.runs} /> : unreadTile(NOW_TILES.runs)}
          {month.incidents ? <Tile tile={month.incidents} /> : unreadTile(NOW_TILES.incidents)}
        </Row>
        <Row split="2/3">
          {runs ? <Runs runs={runs} /> : <Unread title={P.runs} what="the verification runs" />}
          {activity ? <Changes events={activity} end={end} /> : <Unread title={P.changes} what="the changes" />}
        </Row>
      </Meridian>
    </Stack>
  );
}

/** The console route's body: the strips arrive packed, one character a day, and are unpacked here where they are drawn. */
export function PackedNowBody(data: PackedNowData) {
  return <NowBody {...unpackNow(data)} />;
}

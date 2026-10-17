'use client';

import { ArrowRight, Boxes, Cpu, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { useLive } from '@/lib/live';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { KeyValue } from '@/components/ui/key-value';
import { StatusDot } from '@/components/ui/status-dot';
import { ColumnChart } from '@/components/charts/column-chart';
import { CompositionBar } from '@/components/charts/composition-bar';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { SO_FAR, TrendChart } from '@/components/charts/trend-chart';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { MetricTile } from '@/components/patterns/metric-tile';
import { AXIS_FORMATTERS, FORMATTERS, formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { formatDate, formatDay, formatShortDate } from '@/lib/format-date';
import { PERIOD_DAYS, PERIOD_LABEL } from '@/lib/period';
import { AskPeriod } from './ask-period';
import { COMPANY_METRICS, HOME_METRICS, SOLD_SLOTS, homeContext, type HomeData, type HomeWindow } from './home-context';
import { Unread, unreadTile } from './unread';

/** Tells both agents what the Home shows, and which day the Meridian points at (decision 0011). Inside `Meridian`. */
export function ShareHome({ data }: { data: HomeData }) {
  const { index } = useMeridianIndex();
  useShareView(homeContext(data, index));
  return null;
}

const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';
/** A change against the period before, as a fraction; null when nothing comes before or it was zero, which a tile says in words. */
const change = (now: number, before: number | null) => (before ? now / before - 1 : null);
/** "02 Oct": a window's label under its column, the date it ends on. */
const share = (n: number) => formatPercent(n, 1);
const costCompact = FORMATTERS['cost-compact'];

/**
 * The revenue card, the page's one Featured metric: the period's revenue, its change, a day's average and the best day,
 * and revenue a day with the day in progress drawn running. The day in progress is the
 * Meridian's last date, so pointing at it reads it, and its pill says "so far". It is the page's protagonist, marked on
 * a wrapper that is itself the row's first grid item, its card stretched to fill it: a wrapper whose display is
 * `contents` draws no box, so the row's two columns would land on nothing.
 *
 * It carries a finding only where the surface around it has no headline of its own to state the period's record: the
 * console's page title says it, figure and run together, and the card would state it again one screen below. An embed
 * is framed by the view's name and period alone, so there the card carries it. `finding` is that line.
 */
export function RevenueCard({ data, dates, finding }: { data: HomeData; dates: string[]; finding?: string | null }) {
  const r = data.revenue;
  if (!r) return <Unread title={HOME_METRICS.revenue.label} what="the days" />;
  const period = PERIOD_LABEL[data.period].toLowerCase();
  const running = data.running;
  const points = running ? [...r.points, running.revenue] : r.points;
  return (
    <div data-protagonist="Revenue" className="flex min-w-0 flex-col *:flex-1">
      <FeaturedMetric
        kicker={<>{HOME_METRICS.revenue.label} · {period}</>}
        actions={<AskPeriod period={period} what="revenue" onDay={(day) => `Why does revenue on ${day} look the way it does?`} />}
        value={r.value}
        points={points}
        format={formatCost}
        delta={change(r.value, r.previous) ?? undefined}
        intent="up"
        caption={r.best || running ? <>{(r.best ? `About ${formatCost(r.average)} a day. The best day was ${formatDay(r.best.date)}, with ${formatCost(r.best.value)}.` : '') + (running ? ` ${SO_FAR}` : '')}</> : undefined}
        finding={finding ? { text: finding } : undefined}
        pointLabel={(date) => (running && date === running.date ? `${formatDate(date)} · so far` : formatDate(date))}
      >
        <TrendChart
          height="fill"
          label="Revenue per day"
          format="cost"
          dates={dates}
          running={running !== null}
          series={[{ key: 'revenue', label: HOME_METRICS.revenue.label, values: points, kind: 'area' }]}
        />
      </FeaturedMetric>
    </div>
  );
}

/**
 * The three tiles beside the revenue card: the customers, the tokens served and the requests. An array, so a row of
 * tiles counts its three.
 */
export function companyTiles(data: HomeData): ReactNode[] {
  const { customers, tokens, requests } = data;
  const C = COMPANY_METRICS;
  return [
    customers ? (
      <MetricTile
        key="customers"
        label={C.customers.label}
        hint={C.customers.hint}
        icon={<Users />}
        value={customers.count}
        // One line in a tile a third of a 720px reply wide: the three counts in the fewest words.
        note={`${customers.active} active · ${customers.trial} ${customers.trial === 1 ? 'trial' : 'trials'} · ${customers.pastDue} past due`}
        finding={customers.finding ? { text: customers.finding, tone: 'neutral' } : undefined}
      />
    ) : unreadTile(C.customers.label, C.customers.hint),
    tokens ? (
      <MetricTile key="tokens" label={C.tokens.label} hint={C.tokens.hint} icon={<Boxes />} value={tokens.value} format={formatCompact} note={`In ${formatCompact(tokens.requests)} requests`} />
    ) : unreadTile(C.tokens.label, C.tokens.hint),
    requests ? (
      <MetricTile key="requests" label={HOME_METRICS.requests.label} hint={HOME_METRICS.requests.hint} value={requests.value} delta={change(requests.value, requests.previous)} points={requests.points} format={formatCompact} />
    ) : unreadTile(HOME_METRICS.requests.label, HOME_METRICS.requests.hint),
  ];
}

/**
 * The row under them: the days inside the band and compute in use, then compute cost and gross margin, which are
 * keys of the data only for a person who may read what compute cost. For anyone else the row holds two tiles and
 * nothing stands in the place of the others.
 */
function OperatingTiles({ data }: { data: HomeData }) {
  const { band, compute } = data;
  const C = COMPANY_METRICS;
  const mayCost = 'computeCost' in data;
  return (
    <Row split="tiles">
      {band ? <MetricTile label={C.band.label} hint={C.band.hint} value={band.inside} note={`of ${band.of} complete days`} /> : unreadTile(C.band.label, C.band.hint)}
      {compute ? (
        <MetricTile
          label={C.compute.label}
          hint={C.compute.hint}
          icon={<Cpu />}
          value={compute.value}
          format="percent"
          note={points(compute.value, compute.previous)}
          finding={compute.fullest ? { text: `The fullest is ${compute.fullest.region}, at ${share(compute.fullest.value)}`, tone: 'neutral' } : undefined}
        />
      ) : unreadTile(C.compute.label, C.compute.hint)}
      {mayCost ? (
        data.computeCost ? (
          <MetricTile label={C.computeCost.label} hint={C.computeCost.hint} value={data.computeCost.value} delta={change(data.computeCost.value, data.computeCost.previous)} intent="neutral" points={data.computeCost.points} format={formatCost} />
        ) : unreadTile(C.computeCost.label, C.computeCost.hint)
      ) : null}
      {mayCost ? (
        data.grossMargin ? (
          <MetricTile label={C.grossMargin.label} hint={C.grossMargin.hint} value={data.grossMargin.value} format="percent" note={points(data.grossMargin.value, data.grossMargin.previous)} points={data.grossMargin.points} />
        ) : unreadTile(C.grossMargin.label, C.grossMargin.hint)
      ) : null}
    </Row>
  );
}

/**
 * A share's change against the period before, in points, said as every tile says its change: "up 0.3 points vs
 * previous period". It is a tile's one line, so it is held to what a phone's tile beside its Sparkline has room for
 * (about 200px of the line at 390px, in Geist at 12px): a move of two digits, "down 12.3 points vs previous period",
 * is 194px, where the context's "vs the previous 30 days" cut the line at 205px.
 */
function points(now: number, before: number | null): string {
  if (before === null) return 'No earlier period to compare';
  const by = Math.abs(now - before) * 100;
  return by < 0.05 ? 'unchanged vs previous period' : `${now > before ? 'up' : 'down'} ${by.toFixed(1)} points vs previous period`;
}

/** What one window of the year covers, in words, for a card's line. */
const windowWords = (data: HomeData) => {
  const n = PERIOD_DAYS[data.period];
  return n ? `${n} days a column, counted back from yesterday, the latest highlighted` : 'Every complete day kept, as one column';
};

/**
 * The year: requests a window, the latest highlighted, and the median day's p95 a window with the windows' median as
 * its baseline. Two charts on one cursor, the windows' own, each from zero, under the sentence that states them.
 */
function YearCard({ data, keys }: { data: HomeData; keys: string[] }) {
  const year = data.year;
  if (!year) return <Unread title="Requests and latency, a period at a time" what="the history" />;
  return (
    <Card>
      <CardHeader title={year.title} wrap description={windowWords(data)} />
      <CardBody className="flex flex-col gap-6">
        <ColumnChart
          label="Requests a window"
          columns={year.windows.map((w) => ({ key: w.to, label: formatShortDate(w.to), value: w.requests }))}
          highlight={keys.at(-1)}
          dates={keys}
          format={formatCompact}
          axisFormat={AXIS_FORMATTERS.compact}
          height={168}
        />
        <div className="border-t border-line pt-5">
          <p className="t-eyebrow mb-3">Latency p95 · the median day of each window</p>
          <TrendChart
            label="Latency p95 of the median day, a window"
            height={168}
            format="duration"
            dates={keys}
            baseline={year.median !== null ? { value: year.median, label: `Median ${formatDuration(year.median)}` } : undefined}
            series={[{ key: 'p95', label: HOME_METRICS.p95.label, values: year.windows.map((w) => w.p95), kind: 'line', color: 'neutral' }]}
          />
        </div>
      </CardBody>
    </Card>
  );
}

/** The facts of a year, each in its rule's own line under its kind: the same line the context carries. */
function YearCounted({ data }: { data: HomeData }) {
  const title = 'A year, counted';
  if (!data.year) return <Unread title={title} what="the history" />;
  const facts = data.head.facts;
  return (
    <Card>
      <CardHeader title={title} description="Over every complete day kept, whatever the period" />
      <CardBody>
        {facts.length ? (
          <ul className="flex flex-col">
            {facts.map((f) => (
              <li key={f.text} className="flex min-w-0 items-baseline gap-4 border-b border-line py-3 last:border-0">
                <span className="t-eyebrow w-16 shrink-0">{f.kind[0].toUpperCase()}{f.kind.slice(1)}</span>
                <span className="min-w-0 text-sm text-pretty text-ink">{f.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2.5 text-sm text-ink-2">No total, record or first holds yet.</p>
        )}
      </CardBody>
    </Card>
  );
}

/** Revenue a window, over the year's windows, the latest highlighted: on the year's cursor too. */
function RevenueWindows({ data, keys }: { data: HomeData; keys: string[] }) {
  const title = 'Revenue a period';
  if (!data.year) return <Unread title={title} what="the history" />;
  return (
    <Card>
      <CardHeader title={title} description={windowWords(data)} />
      <CardBody>
        <ColumnChart
          label="Revenue a window"
          columns={data.year.windows.map((w: HomeWindow) => ({ key: w.to, label: formatShortDate(w.to), value: w.revenue }))}
          highlight={keys.at(-1)}
          dates={keys}
          format={costCompact}
          axisFormat={AXIS_FORMATTERS['cost-compact']}
          height={200}
        />
      </CardBody>
    </Card>
  );
}

/** What we sell: the period's revenue by model, in the categorical slots in their order, and past them "Other", neutral. */
function Sold({ data }: { data: HomeData }) {
  const { label, hint } = COMPANY_METRICS.sold;
  if (!data.sold) return <Unread title={label} what={['the usage by model', 'the models'].filter((n) => data.unread.includes(n)).join(' and ')} />;
  return (
    <Card>
      <CardHeader title={label} description={`${hint.replace(/\.$/, '')}, ${PERIOD_LABEL[data.period].toLowerCase()}`} />
      <CardBody>
        <CompositionBar label="Revenue by model" format={costCompact} parts={data.sold.map((m, i) => ({ label: m.label, value: m.value, color: i < SOLD_SLOTS ? i + 1 : 'neutral' }))} />
      </CardBody>
    </Card>
  );
}

/** A team's workspace at a glance: four lines of a label and a figure, one counted fact, and the way in. A labelled region, so it is found by its team's name. */
function Team({ name, team }: { name: string; team: HomeData['business'] }) {
  return (
    <Card role="region" aria-label={name}>
      <CardHeader title={name} />
      <CardBody className="flex flex-col gap-3">
        <KeyValue items={team.lines.map((l) => ({ label: l.label, value: l.value }))} />
        {team.fact ? (
          <p className="flex min-w-0 items-start gap-2 text-sm text-ink-2">
            <StatusDot tone="neutral" className="mt-[0.45em]" />
            <span className="min-w-0 text-pretty">{team.fact}</span>
          </p>
        ) : null}
      </CardBody>
      <CardFooter>
        <Link href={team.href} className={linkClass}>Open {name} <ArrowRight className="size-3.5" /></Link>
      </CardFooter>
    </Card>
  );
}

/** At most four lines, each opening the page where it is handled; one line when there is nothing to say. A line's link is a flex item, laid out as a box, so it carries `hit`: a finger's 44px whatever its own height. */
function WorthKnowing({ data }: { data: HomeData }) {
  const title = 'Worth knowing across the company';
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {data.worth.length ? (
          <ul className="flex flex-col">
            {data.worth.map((w) => (
              <li key={w.text} className="flex min-w-0 items-start gap-2.5 border-b border-line py-3 text-sm last:border-0">
                <StatusDot tone="neutral" className="mt-[0.45em]" />
                {w.href ? (
                  <Link href={w.href} className="row-link hit min-w-0 text-pretty text-ink hover:text-accent-ink">{w.text}</Link>
                ) : (
                  <span className="min-w-0 text-pretty text-ink-2">{w.text}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState kind="error" layout="inline" title="What it comes from could not be read">The incidents, the customers or the releases did not answer. The rest of the page is unaffected.</EmptyState>
        )}
      </CardBody>
    </Card>
  );
}

/** No complete day is kept yet: the days were read and hold none. A read that failed is not this; its parts say so. */
export const isEmpty = (data: HomeData) => data.revenue !== null && data.series.length === 0;

/** The days the page's Meridian holds: the period's complete days, then the day in progress when there is one. */
export const meridianDates = (data: HomeData) => [...data.series.map((d) => d.date), ...(data.running ? [data.running.date] : [])];

/**
 * The Home's nine parts, in order: the console page and the MCP view in fullscreen. The head is the page frame's. Each
 * part draws what the read handed it and works nothing out; a part whose read failed says so in its own place.
 *
 * `finding` is the record line the revenue card states, and is passed only by a surface with no headline above it to
 * state that record itself. `data.record` is not it: the read always hands the line over, and the surface decides.
 */
export function HomeBody(data: HomeData & { finding?: string | null }) {
  // Exactly the feature's needs (FEATURES.home): /api/live refuses a name the caller may not read, so `costs` is left out.
  useLive(['days', 'usage', 'models', 'compute', 'incidents', 'customers', 'services', 'tickets', 'tests', 'releases']);
  // No complete day kept: one card says nothing has arrived, and no figure is drawn as if it had.
  if (isEmpty(data)) {
    return (
      <Stack>
        <Card>
          <ShareHome data={data} />
          <EmptyState title="No requests have arrived yet" action={<Link href="/keys" className={linkClass}>API keys <ArrowRight className="size-3.5" /></Link>} className="py-16">
            Revenue, customers and the year&apos;s facts appear here once a key makes its first call and a day is complete.
          </EmptyState>
        </Card>
      </Stack>
    );
  }
  const dates = meridianDates(data);
  const keys = data.year?.windows.map((w) => w.to) ?? [];
  return (
    <Meridian dates={dates} day={data.day}>
      <ShareHome data={data} />
      <Stack>
        <Row split="2/3">
          <RevenueCard data={data} dates={dates} finding={data.finding} />
          <div className="grid min-w-0 gap-(--stack-gap) md:grid-cols-3 lg:flex lg:flex-col">
            {companyTiles(data)}
          </div>
        </Row>
        <OperatingTiles data={data} />
        {/* The year's windows are a cursor of their own: the year's two charts and revenue a period read it together. */}
        <Meridian dates={keys}>
          <YearCard data={data} keys={keys} />
          <YearCounted data={data} />
          <Row split="1/2">
            <RevenueWindows data={data} keys={keys} />
            <Sold data={data} />
          </Row>
        </Meridian>
        <Row split="1/2">
          <Team name="Business" team={data.business} />
          <Team name="Engineering" team={data.engineering} />
        </Row>
        <WorthKnowing data={data} />
      </Stack>
    </Meridian>
  );
}


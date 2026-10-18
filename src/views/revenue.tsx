'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { useLive, type Revisions } from '@/lib/live';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { StatusDot } from '@/components/ui/status-dot';
import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { CompositionBar } from '@/components/charts/composition-bar';
import { Meridian } from '@/components/charts/meridian';
import { SO_FAR, TrendChart } from '@/components/charts/trend-chart';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { MetricTile } from '@/components/patterns/metric-tile';
import { PLANS } from '@/data/sample';
import { AXIS_FORMATTERS, FORMATTERS, formatCompact, formatCost, formatPercent } from '@/lib/format';
import { formatDate, formatDay, formatShortDate } from '@/lib/format-date';
import { PERIOD_DAYS, PERIOD_LABEL } from '@/lib/period';
import { REVENUE_METRICS, WALL_ORDERS, nextPlanWords, revenueContext, signed, yearAgoNote, type RevenueData, type WallOrder, type WorthLine } from './revenue-context';
import { AskPeriod } from './ask-period';
import { Unread, unreadTile } from './unread';

const M = REVENUE_METRICS;
const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';
const costCompact = FORMATTERS['cost-compact'];
/** A change against the period before, as a fraction; null when nothing comes before or it was zero, which a tile says in words. */
const change = (now: number, before: number | null) => (before ? now / before - 1 : null);
/** "02 Oct": a window's label under its column, the date it ends on. */

type Days = NonNullable<RevenueData['days']>;
type Customers = NonNullable<RevenueData['customers']>;

/** A part about the days when none is kept yet: its card says so, and nothing is drawn as if a day were. */
function NoDays({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <EmptyState layout="inline" title="No complete day is kept yet">The first complete day appears here the day after it ends.</EmptyState>
      </CardBody>
    </Card>
  );
}

/**
 * The page's protagonist, its one Featured metric: the period's revenue, its change, the record as its finding and
 * revenue a day with the day in progress drawn running. The hero rounds a figure past nine characters ("$3.3M"), so the
 * caption states it in full, about the period it names, which stays true while a day is read. Its mark is a wrapper
 * that is itself the row's first grid item, its card stretched to fill it, so the row's two columns are its.
 */
function RevenueFigure({ days, dates, period }: { days: Days; dates: string[]; period: RevenueData['period'] }) {
  const { revenue, running, series } = days;
  const label = PERIOD_LABEL[period].toLowerCase();
  const points = [...series.map((d) => d.revenue), ...(running ? [running.revenue] : [])];
  return (
    <div data-protagonist="Revenue" className="flex min-w-0 flex-col *:flex-1">
      <FeaturedMetric
        kicker={<>{M.revenue.label} · {label}</>}
        actions={<AskPeriod period={label} what="revenue" onDay={(day) => `Why does revenue on ${day} look the way it does?`} />}
        value={revenue.value}
        points={points}
        format={formatCost}
        delta={change(revenue.value, revenue.previous) ?? undefined}
        caption={series.length ? `${formatCost(revenue.value)} over the ${series.length} complete ${series.length === 1 ? 'day' : 'days'} to ${formatDate(series.at(-1)!.date)}.${running ? ` ${SO_FAR}` : ''}` : undefined}
        finding={revenue.finding ? { text: revenue.finding } : undefined}
        pointLabel={(date) => (running && date === running.date ? `${formatDate(date)} · so far` : formatDate(date))}
      >
        {series.length ? (
          <TrendChart height="fill" label="Revenue a day, the period" format="cost" dates={dates} running={running !== null} series={[{ key: 'revenue', label: M.revenue.label, values: points, kind: 'area' }]} />
        ) : null}
      </FeaturedMetric>
    </div>
  );
}

/**
 * The three tiles beside it: the period against a year ago with the window it is against named, the best day yet, and
 * who is past due as a count and a share, naming no customer. An array, so the cell beside the figure counts its three.
 */
function tiles(data: RevenueData) {
  const { days, customers, period } = data;
  return [
    days ? (
      days.yearAgo ? (
        <MetricTile key="year" label={M.yearAgo.label} hint={M.yearAgo.hint} value={days.yearAgo.change} format={signed} note={yearAgoNote(days.yearAgo, period)} />
      ) : (
        <MetricTile key="year" label={M.yearAgo.label} hint={M.yearAgo.hint} value="—" note={yearAgoNote(null, period)} />
      )
    ) : unreadTile(M.yearAgo.label, M.yearAgo.hint),
    days ? (
      days.best ? (
        <MetricTile key="best" label={M.best.label} hint={M.best.hint} value={days.best.value} format={formatCost} note={`${formatDay(days.best.date)} · ${days.best.inPeriod} of the ${days.best.of} best days`} />
      ) : (
        <MetricTile key="best" label={M.best.label} hint={M.best.hint} value="—" note={days.series.length ? 'Too few days kept for a record' : 'No complete day is kept yet'} />
      )
    ) : unreadTile(M.best.label, M.best.hint),
    customers ? (
      <MetricTile key="past-due" label={M.pastDue.label} hint={M.pastDue.hint} value={customers.pastDue.count} note={`${formatPercent(customers.pastDue.share, 1)} of 30 days' revenue`} />
    ) : unreadTile(M.pastDue.label, M.pastDue.hint),
  ];
}

/** Revenue a day by plan, the plans stacked from the largest up, with the day in progress drawn running. */
function ByDay({ days, dates, period }: { days: Days; dates: string[]; period: RevenueData['period'] }) {
  const { running } = days;
  return (
    <Card>
      <CardHeader
        title={M.byDay.label}
        description={`Each complete day by the plan of who paid${running ? ', and today so far' : ''}`}
        actions={<AskPeriod period={PERIOD_LABEL[period].toLowerCase()} what="revenue by plan" onDay={(day) => `Why does revenue by plan on ${day} look the way it does?`} />}
      />
      <CardBody>
        <TrendChart
          label="Revenue a day, by plan"
          format="cost"
          dates={dates}
          stacked
          running={running !== null}
          series={PLANS.map((p) => ({ key: p, label: p, values: [...days.series.map((d) => d.revenueByPlan[p]), ...(running ? [running.revenueByPlan[p]] : [])] }))}
        />
      </CardBody>
    </Card>
  );
}

/** Who pays: each plan's share of the period's revenue, and how many customers each plan has. */
function WhoPays({ days, customers }: { days: Days; customers: Customers | null }) {
  return (
    <Card>
      <CardHeader title={M.whoPays.label} description={`${M.whoPays.hint.replace(/\.$/, '')}, with how many customers are on each, trials included`} />
      <CardBody>
        <CompositionBar
          label="Revenue by plan"
          format={costCompact}
          stacked
          parts={days.byPlan.map((p) => ({ label: customers ? `${p.plan} · ${customers.byPlan[p.plan]}` : p.plan, value: p.revenue }))}
        />
      </CardBody>
    </Card>
  );
}

/** Revenue a period, by plan: one column a whole window of the period's length kept, its total at rest above it. */
function ByWindow({ data, days }: { data: RevenueData; days: Days }) {
  const n = PERIOD_DAYS[data.period];
  const keys = days.windows.map((w) => w.to);
  return (
    <Card>
      <CardHeader title={M.byWindow.label} description={n ? `${n} days a column, counted back from yesterday` : 'Every complete day kept, as one column'} />
      <CardBody>
        {keys.length ? (
          // The windows are a cursor of their own, as Home's year is.
          <Meridian dates={keys}>
            <ColumnChart
              label="Revenue a window, by plan"
              parts={PLANS.map((p) => ({ key: p, label: p }))}
              columns={days.windows.map((w) => ({ key: w.to, label: formatShortDate(w.to), values: w.byPlan }))}
              dates={keys}
              format={costCompact}
              axisFormat={AXIS_FORMATTERS['cost-compact']}
              height={200}
            />
          </Meridian>
        ) : (
          <EmptyState layout="inline" title={`No whole ${n} days are kept yet`}>A column appears once as many complete days are kept.</EmptyState>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Every customer, the last 14 days: the eight the chosen order picks, each a compact tile inside one link to the
 * customer's page, then how many of every customer sent more this week than last, and the way to every customer.
 */
function Wall({ customers, order, onOrder }: { customers: Customers; order: WallOrder; onOrder: (o: WallOrder) => void }) {
  const { orders, sentMore, of } = customers.wall;
  const shown = orders[order];
  return (
    <Card>
      <CardHeader title={M.wall.label} description="What each paid in 30 days and its plan, and its requests this week against last" />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Segmented label="Order of the customers" size="sm" value={order} onChange={onOrder} options={WALL_ORDERS.map((o) => ({ value: o.value, label: o.label }))} />
          <p className="text-sm text-ink-2">{sentMore} of {of} sent more this week than last</p>
        </div>
        {shown.length ? (
          <div className="@container">
            <ul className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4">
              {shown.map((t) => (
                <li key={t.id} className="min-w-0">
                  <Link href={`/customers/${t.id}`} className="block rounded-lg [&:hover_h2]:text-accent-ink">
                    <MetricTile size="compact" label={t.name} value={t.revenue} format={costCompact} note={t.plan} delta={t.week} compare="vs last week" points={t.trend} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-2 text-sm text-ink-2">No customer {order === 'fell' ? 'sent less' : 'sent more'} this week than last.</p>
        )}
      </CardBody>
      <CardFooter>
        <Link href="/customers" className={linkClass}>Every customer <ArrowRight className="size-3.5" /></Link>
      </CardFooter>
    </Card>
  );
}

/**
 * From a trial to Enterprise: a Bar list a stage, its two that paid the most opening their pages and the rest folded
 * into "N others", summed, under the line counting who joined, moved up and left. The Bar list folds what each other
 * customer paid itself, so it is handed those as rows it never draws.
 */
function Ladder({ customers }: { customers: Customers }) {
  const { stages, line } = customers.ladder;
  return (
    <Card>
      <CardHeader title={M.ladder.label} wrap description={line} />
      <CardBody>
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          {stages.map((s) => (
            <div key={s.label} className="min-w-0">
              <p className="t-eyebrow mb-3">{s.label} · {s.shown.length + s.others.length}</p>
              <BarList
                label={s.label}
                limit={2}
                format={costCompact}
                items={[
                  ...s.shown.map((c) => ({ key: c.id, label: c.name, value: c.revenue, href: `/customers/${c.id}`, meta: c.next ? nextPlanWords(c.next) : undefined })),
                  ...s.others.map((value, i) => ({ key: `${s.label}:${i}`, label: '', value })),
                ]}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/** A line worth a look: where it names a customer, the name is the link to its page and the rest of the line is text. */
function WorthText({ line }: { line: WorthLine }) {
  const at = line.customer ? line.text.indexOf(line.customer.name) : -1;
  if (!line.customer || at < 0) return <>{line.text}</>;
  return (
    <>
      {line.text.slice(0, at)}
      <Link href={line.customer.href} className="row-link font-medium text-ink">{line.customer.name}</Link>
      {line.text.slice(at + line.customer.name.length)}
    </>
  );
}

function WorthALook({ customers }: { customers: Customers }) {
  return (
    <Card>
      <CardHeader title={M.worth.label} />
      <CardBody>
        <ul className="flex flex-col">
          {customers.worth.map((w) => (
            <li key={w.text} className="flex min-w-0 items-start gap-2.5 border-b border-line py-3 text-sm last:border-0">
              <StatusDot tone="neutral" className="mt-[0.45em]" />
              <span className="min-w-0 text-pretty text-ink-2"><WorthText line={w} /></span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/** What they buy: the period's revenue by model. */
function Sold({ data }: { data: RevenueData }) {
  if (!data.sold) return <Unread title={M.sold.label} what={['the usage by model', 'the models'].filter((n) => data.unread.includes(n)).join(' and ')} />;
  return (
    <Card>
      <CardHeader title={M.sold.label} description={`${M.sold.hint.replace(/\.$/, '')}, ${PERIOD_LABEL[data.period].toLowerCase()}`} />
      <CardBody>
        <BarList label="Revenue by model" format={costCompact} items={data.sold.map((m) => ({ key: m.key, label: m.label, value: m.value }))} />
      </CardBody>
    </Card>
  );
}

/** Where they are: requests by region, over the window the regions cover. */
function Regions({ data }: { data: RevenueData }) {
  if (!data.regions) return <Unread title={M.regions.label} what="the regions" />;
  return (
    <Card>
      <CardHeader title={M.regions.label} description={`${M.regions.hint.replace(/\.$/, '')}, whatever the period`} />
      <CardBody>
        <BarList label="Requests by region" format={formatCompact} items={data.regions.map((r) => ({ key: r.label, label: r.label, value: r.value }))} />
      </CardBody>
    </Card>
  );
}

/** Nothing has arrived: the days and the customers were read and hold none. A read that failed is not this; its parts say so. */
const isEmpty = (data: RevenueData) => data.days !== null && data.days.series.length === 0 && data.customers !== null && data.customers.count === 0;

/**
 * Revenue's eight parts, in order: the head is the page frame's, and the Featured metric leads the body. Each part draws what the read handed it and works
 * nothing out; a part whose read failed says so in its own place. The wall's order is the person's, and the context
 * follows it.
 */
export function RevenueBody(data: RevenueData & { revisions?: Revisions }) {
  const [order, setOrder] = useState<WallOrder>('largest');
  useShareView(revenueContext(data, order));
  // Exactly the feature's needs (FEATURES.revenue): /api/live refuses a name the caller may not read.
  useLive(['customers', 'days', 'usage', 'models', 'regions'], data.revisions);
  if (isEmpty(data)) {
    return (
      <Stack>
        <Card>
          <EmptyState title="Nothing has arrived yet" action={<Link href="/keys" className={linkClass}>API keys <ArrowRight className="size-3.5" /></Link>} className="py-16">
            Revenue, customers and what they buy appear here once a customer makes its first call and a day is complete.
          </EmptyState>
        </Card>
      </Stack>
    );
  }
  const { days, customers } = data;
  const dates = days ? [...days.series.map((d) => d.date), ...(days.running ? [days.running.date] : [])] : [];
  return (
    <Meridian dates={dates}>
      <Stack>
        <Row split="2/3">
          {days ? <RevenueFigure days={days} dates={dates} period={data.period} /> : <Unread title={M.revenue.label} what="the days" />}
          <div className="grid min-w-0 gap-(--stack-gap) md:grid-cols-3 lg:flex lg:flex-col">{tiles(data)}</div>
        </Row>
        <Row split="2/3">
          {days?.series.length ? <ByDay days={days} dates={dates} period={data.period} /> : days ? <NoDays title={M.byDay.label} /> : <Unread title={M.byDay.label} what="the days" />}
          {days?.series.length ? <WhoPays days={days} customers={customers} /> : days ? <NoDays title={M.whoPays.label} /> : <Unread title={M.whoPays.label} what="the days" />}
        </Row>
        {days?.series.length ? <ByWindow data={data} days={days} /> : days ? <NoDays title={M.byWindow.label} /> : <Unread title={M.byWindow.label} what="the days" />}
        {customers ? <Wall customers={customers} order={order} onOrder={setOrder} /> : <Unread title={M.wall.label} what="the customers" />}
        {customers ? <Ladder customers={customers} /> : <Unread title={M.ladder.label} what="the customers" />}
        {customers ? <WorthALook customers={customers} /> : <Unread title={M.worth.label} what="the customers" />}
        <Row split="1/2">
          <Sold data={data} />
          <Regions data={data} />
        </Row>
      </Stack>
    </Meridian>
  );
}

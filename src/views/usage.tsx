'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { app } from '@/app.config';
import { Row, Stack } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { StatusDot } from '@/components/ui/status-dot';
import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { CompositionBar } from '@/components/charts/composition-bar';
import { Heatmap } from '@/components/charts/heatmap';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { SO_FAR, TrendChart } from '@/components/charts/trend-chart';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import type { UsageFigures } from '@/data/usage';
import { AXIS_FORMATTERS, formatCompact, formatDuration } from '@/lib/format';
import { formatDate, formatShortDate } from '@/lib/format-date';
import { PERIOD_LABEL } from '@/lib/period';
import { ASKED, STATUS_COLOR, USAGE_PARTS as P, WHEN, usageContext, type UsageData, type When } from './usage-context';
import { AskPeriod } from './ask-period';
import { Unread } from './unread';

const linkClass = 'row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink';

type Days = NonNullable<UsageData['days']>;
type Calendar = NonNullable<UsageData['calendar']>;

/** Tells both agents what Usage shows, and the day the Meridian points at (decision 0011). */
function ShareUsage({ data }: { data: UsageData }) {
  const { index } = useMeridianIndex();
  useShareView(usageContext(data, index));
  return null;
}

/** A change against the period before, as a fraction; undefined when nothing comes before or it was zero, and the figure then draws no change. */
const change = (now: number, before: number | null) => (before ? now / before - 1 : undefined);

/**
 * The page's protagonist, its one Featured metric: the period's requests, their change, the period's record as its
 * finding, and requests a day with the day in progress drawn running. The caption states the exact count, about the
 * period it names, which stays true while a day is read. Its mark is a wrapper whose display is `contents`.
 */
function Requests({ data, days, dates }: { data: UsageData; days: Days; dates: string[] }) {
  const { series, running, totals } = days;
  const period = PERIOD_LABEL[data.period].toLowerCase();
  const points = [...series.map((d) => d.requests), ...(running ? [running.requests] : [])];
  return (
    <div data-protagonist="Requests" className="contents">
      <FeaturedMetric
        className="w-full"
        kicker={<>Requests · {period}</>}
        actions={<AskPeriod period={period} what="requests" onDay={(day) => `Why do requests on ${day} look the way they do?`} />}
        value={totals.current.requests}
        points={points}
        format={formatCompact}
        delta={change(totals.current.requests, totals.previous?.requests ?? null)}
        caption={series.length ? `${totals.current.requests.toLocaleString('en-US')} requests over the ${series.length} complete ${series.length === 1 ? 'day' : 'days'} to ${formatDate(series.at(-1)!.date)}, ${app.timezone}.${running ? ` ${SO_FAR}` : ''}` : undefined}
        finding={data.record ? { text: data.record } : undefined}
        pointLabel={(date) => (running && date === running.date ? `${formatDate(date)} · so far` : formatDate(date))}
      >
        {series.length ? <TrendChart height="fill" label="Requests a day, the period" dates={dates} running={running !== null} series={[{ key: 'requests', label: 'Requests', values: points, kind: 'area' }]} /> : null}
      </FeaturedMetric>
    </div>
  );
}

/** A year of requests, a day a cell: every complete day kept and the day in progress, joined to the page's Meridian, the busiest day as its badge. */
function Year({ calendar }: { calendar: Calendar }) {
  const { busiest } = calendar;
  return (
    <Card>
      <CardHeader
        title={P.year}
        wrap
        description={`Every complete day kept, a column a week, ${app.timezone}. Point at a day of the period and the chart above reads it.`}
        actions={busiest ? <Badge tone="accent">Busiest: {formatShortDate(busiest.date)}, {formatCompact(busiest.value)}</Badge> : null}
      />
      <CardBody>
        <Heatmap days={calendar.days} running={calendar.running} scale="max" meridian label="Requests a day, every day kept" format={formatCompact} />
      </CardBody>
    </Card>
  );
}

/** The period, counted: the facts the rules found, each with its date, or one line saying none holds. */
function Counted({ data }: { data: UsageData }) {
  const { facts } = data.head;
  return (
    <Card>
      <CardHeader title={P.counted} description="Each found by a rule over every complete day kept" />
      <CardBody>
        {facts.length ? (
          <ul className="flex flex-col">
            {facts.map((f) => (
              <li key={f.text} className="flex min-w-0 items-start gap-2.5 border-b border-line py-3 text-sm last:border-0">
                <StatusDot tone="neutral" className="mt-[0.45em]" />
                <span className="min-w-0 text-pretty text-ink-2">{f.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-ink-2">No record and no first falls in this period.</p>
        )}
      </CardBody>
    </Card>
  );
}

/** When they come, over the last 30 complete days: by hour of day, the busiest highlighted, or by weekday and hour. The choice is the view's own. */
function WhenTheyCome({ figures }: { figures: UsageFigures }) {
  const [when, setWhen] = useState<When>('hour');
  const busiest = figures.hours.reduce((m, c) => ((c.value ?? 0) > (m.value ?? 0) ? c : m));
  return (
    <Card>
      <CardHeader
        title={P.when}
        description={when === 'hour' ? `Every weekday summed, ${app.timezone}, over the last 30 complete days. The busiest hour is ${busiest.label}.` : `Each weekday and hour, ${app.timezone}, over the last 30 complete days, in five steps of equal count.`}
      />
      <CardBody className="flex flex-col gap-4">
        <Segmented label="Count when they come" size="sm" value={when} onChange={setWhen} options={WHEN} />
        {when === 'hour' ? (
          <ColumnChart columns={figures.hours} highlight={busiest.key} format={formatCompact} axisFormat={AXIS_FORMATTERS.count} label="Requests by hour of day" labelEvery={6} height={220} />
        ) : (
          <Heatmap values={figures.heat} timezone={app.timezone} scale="quantile" label="Requests by weekday and hour" format={formatCompact} />
        )}
      </CardBody>
    </Card>
  );
}

/** Where from: requests by region over the last 30 complete days, each with its median latency. */
function WhereFrom({ figures }: { figures: UsageFigures }) {
  return (
    <Card>
      <CardHeader title={P.where} description="Requests by region, with median latency, over the last 30 complete days" />
      <CardBody>
        <BarList label="Requests by region" format={formatCompact} items={figures.regions.map((r) => ({ key: r.label, label: <span className="font-mono text-xs">{r.label}</span>, value: r.value, meta: `p50 ${formatDuration(r.p50)}` }))} />
      </CardBody>
    </Card>
  );
}

/** What is asked for: requests by endpoint over the last 30 complete days, the five most requested and the rest in one row. */
function Asked({ endpoints }: { endpoints: NonNullable<UsageData['endpoints']> }) {
  return (
    <Card>
      <CardHeader title={P.asked} description="Requests by endpoint over the last 30 complete days" />
      <CardBody>
        <BarList
          label="Requests by endpoint"
          limit={ASKED}
          format={formatCompact}
          items={endpoints.map((e) => ({ key: `${e.method} ${e.route}`, label: <span className="font-mono text-xs">{e.method} {e.route}</span>, value: e.requests }))}
        />
      </CardBody>
    </Card>
  );
}

/** How it was answered: the responses of the last 30 complete days by status class, in status colours. */
function Answered({ responses }: { responses: NonNullable<UsageData['responses']> }) {
  return (
    <Card>
      <CardHeader title={P.answered} description="Responses by status class over the last 30 complete days" />
      <CardBody>
        <CompositionBar label="Responses by status class" format={formatCompact} parts={responses.map((r) => ({ ...r, color: STATUS_COLOR[r.label as keyof typeof STATUS_COLOR] ?? 'neutral' }))} />
      </CardBody>
    </Card>
  );
}

/** Nothing has arrived: the days and every day kept were read and hold no complete day. A read that failed is not this; its parts say so. */
const isEmpty = (data: UsageData) => data.days !== null && data.days.series.length === 0 && data.calendar !== null && data.calendar.busiest === null;

/**
 * Usage's parts, in order: the head is the page frame's, and the Featured metric leads the body. Each part draws what
 * the read handed it and works nothing out; a part whose read failed says so in its own place. One Meridian holds the
 * period's days: pointing at a day in the Featured metric's chart, or at a day of the period in the calendar, reads it
 * in both.
 */
export function UsageBody(data: UsageData) {
  if (isEmpty(data)) {
    return (
      <Stack>
        <ShareUsage data={data} />
        <Card>
          <EmptyState title="No requests have arrived yet" action={<Link href="/keys" className={linkClass}>API keys <ArrowRight className="size-3.5" /></Link>} className="py-16">
            Requests a day, when they come and where from appear here once a customer makes its first call and a day is complete.
          </EmptyState>
        </Card>
      </Stack>
    );
  }
  const { days, calendar, figures, endpoints, responses } = data;
  const dates = days ? [...days.series.map((d) => d.date), ...(days.running ? [days.running.date] : [])] : [];
  return (
    <Meridian dates={dates} day={data.day}>
      <ShareUsage data={data} />
      <Stack>
        {days ? <Requests data={data} days={days} dates={dates} /> : <Unread title="Requests" what="the days" />}
        {calendar ? <Year calendar={calendar} /> : <Unread title={P.year} what="the history" />}
        <Row split="1/3">
          {calendar && days ? <Counted data={data} /> : <Unread title={P.counted} what={calendar ? 'the days' : 'the history'} />}
          {figures ? <WhenTheyCome figures={figures} /> : <Unread title={P.when} what="the hours and the regions" />}
        </Row>
        <Row split="1/2">
          {figures ? <WhereFrom figures={figures} /> : <Unread title={P.where} what="the hours and the regions" />}
          {endpoints ? <Asked endpoints={endpoints} /> : <Unread title={P.asked} what="the endpoints" />}
        </Row>
        {responses ? <Answered responses={responses} /> : <Unread title={P.answered} what="the responses" />}
      </Stack>
    </Meridian>
  );
}

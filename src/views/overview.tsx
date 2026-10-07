'use client';

import { AlertTriangle, ArrowRight, CircleDollarSign, Gauge } from 'lucide-react';
import Link from 'next/link';
import { Row, Stack } from '@/components/base/shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { useShareView } from '@/components/base/use-share-view';
import { useLive } from '@/lib/live';
import { TrendChart } from '@/components/charts/trend-chart';
import { BarList } from '@/components/charts/bar-list';
import { CompositionBar } from '@/components/charts/composition-bar';
import { MetricTile } from '@/components/patterns/metric-tile';
import { RouteCell } from '@/system/sample-cells';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { formatDate } from '@/lib/format-date';
import { ActivityFeed } from '@/components/patterns/activity-feed';
import { AskAbout } from '@/components/patterns/ask-about';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { PERIOD_LABEL } from '@/lib/period';
import { OVERVIEW_METRICS, overviewContext, type OverviewData } from './overview-context';

/** Tells both agents what the Overview shows, and which day the Meridian points at (decision 0011). Inside `Meridian`. */
export function ShareOverview({ data }: { data: OverviewData }) {
  const { index } = useMeridianIndex();
  useShareView(overviewContext(data, index));
  return null;
}

/** Ask on the featured card: about the day the Meridian points at, or about the period. */
function AskOverview({ period }: { period: string }) {
  const { index, dates } = useMeridianIndex();
  const day = index !== null ? dates[index] : null;
  return <AskAbout question={day ? `Why do requests, errors and latency on ${formatDate(day)} look the way they do?` : `What stands out in requests, errors and latency over the ${period}, and why?`} />;
}

/**
 * The Overview's rows: the console page and the MCP view in fullscreen. `now` is the data's clock, as an ISO string:
 * relative times read against it, never against render time.
 */
export function OverviewBody(data: OverviewData) {
  const { series, totals, endpoints, mix, activity, now } = data;
  // A change anyone makes, an agent's included, reaches an open Overview's Activity without a reload.
  useLive(['activity']);
  const period = PERIOD_LABEL[data.period].toLowerCase();
  if (series.length === 0) {
    return (
      <Card>
        <ShareOverview data={data} />
        <EmptyState title="No requests yet" action={<Link href="/keys" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">API keys <ArrowRight className="size-3.5" /></Link>} className="py-16">
          Traffic, reliability and spend appear here once a key makes its first call.
        </EmptyState>
      </Card>
    );
  }
  const { current: c, previous: p } = totals;
  const dates = series.map((d) => d.date);
  const change = (a: number, b: number) => (b ? a / b - 1 : null);
  const peak = series.reduce((m, d) => (d.requests > m.requests ? d : m), series[0]);
  return (
    <Meridian dates={dates} day={data.day}>
      <ShareOverview data={data} />
      <Stack>
        <Row split="2/3">
          <FeaturedMetric
            kicker={<>Requests · {period}</>}
            actions={<AskOverview period={period} />}
            value={c.requests}
            daily={series.map((d) => d.requests)}
            format={formatCompact}
            delta={change(c.requests, p.requests)}
            caption={<>About {formatCompact(Math.round(c.requests / series.length))} a day. The busiest day was {formatDate(peak.date).replace(/,? \d{4}$/, '')}, with {formatCompact(peak.requests)}.</>}
          >
            <TrendChart
              height="fill"
              label="Requests per day"
              dates={dates}
              series={[
                { key: 'requests', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' },
              ]}
            />
          </FeaturedMetric>
          <div className="grid min-w-0 gap-(--stack-gap) md:grid-cols-3 lg:flex lg:flex-col">
            <MetricTile
              label={OVERVIEW_METRICS.errorRate.label}
              hint={OVERVIEW_METRICS.errorRate.hint}
              icon={<AlertTriangle />}
              value={c.errorRate}
              delta={change(c.errorRate, p.errorRate)}
              intent="down"
              daily={series.map((d) => d.errors / d.requests)}
              format={(n) => formatPercent(n, 2)}
            />
            <MetricTile
              label={OVERVIEW_METRICS.p95.label}
              hint={OVERVIEW_METRICS.p95.hint}
              icon={<Gauge />}
              value={c.p95}
              delta={change(c.p95, p.p95)}
              intent="down"
              daily={series.map((d) => d.p95)}
              format={(n) => formatDuration(n)}
            />
            <MetricTile
              label={OVERVIEW_METRICS.spend.label}
              hint={OVERVIEW_METRICS.spend.hint}
              icon={<CircleDollarSign />}
              value={c.spend}
              delta={change(c.spend, p.spend)}
              intent="neutral"
              daily={series.map((d) => d.spend)}
              format={(n) => formatCost(n)}
            />
          </div>
        </Row>
        <Row split="1/2">
          <Card>
            <CardHeader title="Busiest endpoints" description="Requests in the period" />
            <CardBody>
              <BarList
                label="Requests by endpoint"
                highlight="/v1/messages"
                limit={5}
                format={formatCompact}
                items={endpoints.map((e) => ({
                  key: e.route,
                  label: <RouteCell method={e.method} route={e.route} />,
                  value: e.requests,
                }))}
              />
            </CardBody>
            <CardFooter>
              <Link href="/analytics" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">
                All endpoints <ArrowRight className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader title="Responses" description="By status class, in the period" />
            <CardBody className="flex flex-col gap-6">
              <CompositionBar
                label="Responses by status class"
                format={formatCompact}
                parts={[
                  // The normal case is the quietest part; only the classes that need a look carry status colour.
                  { ...mix[0], color: 'neutral' },
                  { ...mix[1], color: 'neutral-ink' },
                  { ...mix[2], color: 'warning' },
                  { ...mix[3], color: 'critical' },
                ]}
              />
              <div className="border-t border-line pt-5">
                <p className="t-eyebrow mb-3">Latency p95 · per day</p>
                <TrendChart
                label="Latency p95 per day"
                height={168}
                format="duration"
                dates={dates}
                series={[{ key: 'p95', label: 'Latency p95', values: series.map((d) => d.p95), kind: 'line', color: 'neutral' }]}
                />
              </div>
            </CardBody>
          </Card>
        </Row>
        <Row>
          <Card>
            <CardHeader title="Activity" description="Changes to this workspace, newest first" divided />
            <CardBody>
              <ActivityFeed events={activity} now={new Date(now)} />
            </CardBody>
          </Card>
        </Row>
      </Stack>
    </Meridian>
  );
}

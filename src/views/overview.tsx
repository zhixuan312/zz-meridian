'use client';

import { AlertTriangle, ArrowUpRight, CircleDollarSign, Gauge } from 'lucide-react';
import Link from 'next/link';
import { Row, Stack } from '@/components/base/shell';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { BarList } from '@/components/charts/bar-list';
import { CompositionBar } from '@/components/charts/composition-bar';
import { MetricTile } from '@/components/patterns/metric-tile';
import { RouteCell } from '@/system/sample-cells';
import { FeaturedMetric } from '@/components/patterns/featured-metric';
import { formatDate } from '@/lib/format-date';
import { ActivityFeed } from '@/components/patterns/activity-feed';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import type { DailyPoint, Endpoint, Totals } from '@/system/fixtures/sample';
import type { ActivityEvent } from '@/components/patterns/activity-feed';

export function OverviewBody({
  period = 'last 30 days',
  series,
  totals,
  endpoints,
  mix,
  activity,
  now,
}: {
  /** The period, in words, for the featured kicker. */
  period?: string;
  series: DailyPoint[];
  totals: { current: Totals; previous: Totals };
  endpoints: Endpoint[];
  mix: { label: string; value: number }[];
  activity: ActivityEvent[];
  /** The data's clock, as an ISO string: relative times read against it, never against render time. */
  now: string;
}) {
  const { current: c, previous: p } = totals;
  const dates = series.map((d) => d.date);
  const change = (a: number, b: number) => (b ? a / b - 1 : null);
  const peak = series.reduce((m, d) => (d.requests > m.requests ? d : m), series[0]);
  return (
    <Meridian dates={dates}>
      <Stack>
        <Row split="2/3">
          <FeaturedMetric
            kicker={<>Requests · {period}</>}
            value={c.requests}
            daily={series.map((d) => d.requests)}
            format={formatCompact}
            delta={change(c.requests, p.requests)}
            caption={<>About {formatCompact(Math.round(c.requests / series.length))} a day. The busiest day was {formatDate(peak.date).replace(/,? \d{4}$/, '')}, with {formatCompact(peak.requests)}.</>}
            actions={<Badge tone="accent" dot>Live</Badge>}
          >
            <TrendChart
              height="fill"
              label="Requests per day"
              dates={dates}
              series={[
                { key: 'requests', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' },
                { key: 'errors', label: 'Errors × 20', values: series.map((d) => d.errors * 20), kind: 'dashed' },
              ]}
            />
          </FeaturedMetric>
          <div className="flex min-w-0 flex-col gap-(--stack-gap)">
            <MetricTile
              label="Error rate"
              hint="Share of requests answered with a 5xx or a 429."
              icon={<AlertTriangle />}
              value={c.errorRate}
              delta={change(c.errorRate, p.errorRate)}
              intent="down"
              daily={series.map((d) => d.errors / d.requests)}
              format={(n) => formatPercent(n, 2)}
            />
            <MetricTile
              label="Latency p95"
              hint="95 of every 100 requests finished faster than this."
              icon={<Gauge />}
              value={c.p95}
              delta={change(c.p95, p.p95)}
              intent="down"
              daily={series.map((d) => d.p95)}
              format={(n) => formatDuration(n)}
            />
            <MetricTile
              label="Spend"
              hint="Metered usage in US dollars, before credits."
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
              <Link href="/analytics" className="row-link inline-flex items-center gap-1 font-medium text-ink">
                All endpoints <ArrowUpRight className="size-3.5" />
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
                  { ...mix[0], color: 'neutral' },
                  { ...mix[1], color: 1 },
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
                series={[{ key: 'p95', label: 'Latency p95', values: series.map((d) => d.p95), kind: 'line', color: 4 }]}
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

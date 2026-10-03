'use client';

import { Row, Stack } from '@/components/base/shell';
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { AskAbout } from '@/components/patterns/ask-about';
import { OverviewBody } from '@/views/overview';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { PERIOD_LABEL, type Period } from '@/lib/period';
import type { DailyPoint, Endpoint, Totals } from '@/system/fixtures/relay';
import type { ActivityEvent } from '@/components/patterns/activity-feed';

type Props = {
  period: Period;
  series: DailyPoint[];
  totals: { current: Totals; previous: Totals };
  endpoints: Endpoint[];
  mix: { label: string; value: number }[];
  activity: ActivityEvent[];
  updatedAt: string;
  now: string;
};

export function EmbedOverview(p: Props) {
  const s = useSurface();
  const dates = p.series.map((d) => d.date);
  return (
    <Meridian dates={dates}>
      <EmbedFrame
        title={`Overview · ${PERIOD_LABEL[p.period]}`}
        meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />}
        consolePath={`/?period=${p.period}`}
      >
        {s.mode === "fullscreen" ? <OverviewBody {...p} period={PERIOD_LABEL[p.period].toLowerCase()} /> : <Inline {...p} dates={dates} />}
      </EmbedFrame>
    </Meridian>
  );
}

function Inline({ series, totals, period, dates }: Props & { dates: string[] }) {
  const { current: c, previous: v } = totals;
  const { index } = useMeridianIndex();
  const day = index !== null ? series[index] : null;
  useShareView(
    day
      ? `The person is looking at ${formatDate(day.date)}: ${day.requests.toLocaleString('en-US')} requests, ${formatPercent(day.errors / day.requests, 2)} errors, p95 ${day.p95}ms.`
      : `Relay overview for ${PERIOD_LABEL[period].toLowerCase()}: ${formatCompact(c.requests)} requests, ${formatPercent(c.errorRate, 2)} errors, p95 ${formatDuration(c.p95)}.`,
    { view: 'overview', period, day: day?.date ?? null },
  );
  const change = (a: number, b: number) => (b ? a / b - 1 : null);
  return (
    <Stack className="gap-3">
      <Row split="tiles" className="gap-3">
        <MetricTile label="Requests" value={c.requests} delta={change(c.requests, v.requests)} daily={series.map((d) => d.requests)} format={formatCompact} emphasis />
        <MetricTile label="Error rate" value={c.errorRate} delta={change(c.errorRate, v.errorRate)} intent="down" daily={series.map((d) => d.errors / d.requests)} format={(n) => formatPercent(n, 2)} />
        <MetricTile label="Latency p95" value={c.p95} delta={change(c.p95, v.p95)} intent="down" daily={series.map((d) => d.p95)} format={formatDuration} />
      </Row>
      <Card>
        <CardHeader title="Requests per day" actions={<AskAbout question={day ? `Why did requests change on ${formatDate(day.date)}?` : 'What drove the trend in requests this period?'} />} />
        <CardBody>
          <TrendChart label="Requests per day" height={168} dates={dates} series={[{ key: 'r', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' }]} />
        </CardBody>
      </Card>
    </Stack>
  );
}

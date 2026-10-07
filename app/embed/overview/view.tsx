'use client';

import { Row, Stack } from '@/components/base/shell';
import { useSurface } from '@/components/base/surface';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { AskAbout } from '@/components/patterns/ask-about';
import { OverviewBody, ShareOverview } from '@/views/overview';
import { OVERVIEW_METRICS, overviewFindings, type OverviewData } from '@/views/overview-context';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { PERIOD_LABEL } from '@/lib/period';

/** Inline: three figures and the trend. Fullscreen: the console's Overview rows. Both share the same context. */
export function EmbedOverview(p: OverviewData) {
  const s = useSurface();
  const dates = p.series.map((d) => d.date);
  return (
    <Meridian dates={dates} day={p.day}>
      <EmbedFrame
        title={`Overview · ${PERIOD_LABEL[p.period]}`}
        meta={<Freshness updatedAt={new Date(p.updatedAt)} now={new Date(p.now)} />}
        consolePath={`/?period=${p.period}`}
      >
        {s.mode === 'fullscreen' ? <OverviewBody {...p} /> : <Inline {...p} dates={dates} />}
      </EmbedFrame>
    </Meridian>
  );
}

function Inline(p: OverviewData & { dates: string[] }) {
  const { series, totals, dates } = p;
  const { current: c, previous: v } = totals;
  const { index } = useMeridianIndex();
  const day = index !== null ? series[index] : null;
  const change = (a: number, b: number) => (b ? a / b - 1 : null);
  const M = OVERVIEW_METRICS;
  const found = overviewFindings(series);
  return (
    <Stack className="gap-3">
      <ShareOverview data={p} />
      <Row split="tiles" className="gap-3">
        <MetricTile label={M.requests.label} hint={M.requests.hint} value={c.requests} delta={change(c.requests, v.requests)} daily={series.map((d) => d.requests)} format={formatCompact} emphasis />
        <MetricTile label={M.errorRate.label} hint={M.errorRate.hint} value={c.errorRate} delta={change(c.errorRate, v.errorRate)} intent="down" daily={series.map((d) => d.errors / d.requests)} baseline={found.usual.errorRate} finding={found.errorSpike} format={(n) => formatPercent(n, 2)} />
        <MetricTile label={M.p95.label} hint={M.p95.hint} value={c.p95} delta={change(c.p95, v.p95)} intent="down" daily={series.map((d) => d.p95)} baseline={found.usual.p95} format={formatDuration} />
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

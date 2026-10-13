'use client';

import { useState } from 'react';
import { AlertTriangle, Activity, CircleDollarSign, Gauge } from 'lucide-react';
import { Row, Stack } from '@/components/base/shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type SortDirection } from '@/components/ui/table';
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';
import { useShareView } from '@/components/base/use-share-view';
import { usageContext, type UsageData } from './usage-context';
import { HOME_METRICS } from './home-context';
import { MetricTile } from '@/components/patterns/metric-tile';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart } from '@/components/charts/column-chart';
import { Heatmap } from '@/components/charts/heatmap';
import { BarList } from '@/components/charts/bar-list';
import { cn } from '@/lib/cn';
import { AXIS_FORMATTERS, formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { RouteCell } from '@/system/sample-cells';
import { AskAbout } from '@/components/patterns/ask-about';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Tells both agents what Usage shows, the endpoints' order and the day the Meridian points at (decision 0011). */
function ShareUsage({ data, sort }: { data: UsageData; sort: string }) {
  const { index } = useMeridianIndex();
  useShareView(usageContext(data, { sort, index }));
  return null;
}

/** Ask on the errors card: about the day the Meridian points at, or about the period's days. */
function AskErrors() {
  const { index, dates } = useMeridianIndex();
  return <AskAbout question={index !== null ? `Why did errors change on ${formatDate(dates[index])}?` : 'Which days stand out in errors this period, and why?'} />;
}

/** The Usage page's body: the period's four figures against the period before, then when traffic comes, where from, and what is slow. */
export function UsageBody(data: UsageData) {
  const { series, totals, heat, hours, regions, endpoints } = data;
  const [sort, setSort] = useState<{ key: 'requests' | 'errorRate' | 'p95'; dir: Exclude<SortDirection, false> }>({ key: 'p95', dir: 'desc' });
  if (!series.length || !heat.length || !hours.length || !regions.length || !endpoints.length) {
    return (
      <Card>
        <ShareUsage data={data} sort="p95 descending" />
        <EmptyState title="No requests in this period" className="py-16">Pick a longer period, or come back once traffic arrives.</EmptyState>
      </Card>
    );
  }
  const dates = series.map((d) => d.date);
  const { current: c, previous: p } = totals;
  const change = (a: number, b: number) => (b ? a / b - 1 : null);
  const sortLabel = `${{ requests: 'requests', errorRate: 'error rate', p95: 'p95' }[sort.key]} ${sort.dir === 'desc' ? 'descending' : 'ascending'}`;
  const peak = heat.flatMap((row, d) => row.map((v, h) => ({ v, d, h }))).reduce((m, c) => (c.v > m.v ? c : m));
  const peakHour = hours.reduce((m, c) => (c.value > m.value ? c : m));
  const rows = [...endpoints].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (a[sort.key] - b[sort.key]));
  const maxP95 = Math.max(...endpoints.map((e) => e.p95));
  const by = (key: typeof sort.key) => ({
    sort: sort.key === key ? sort.dir : (false as const),
    onSort: () => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })),
  });
  return (
    // One Meridian for the page: pointing at a day in either trend reads that day in the four figures too.
    <Meridian dates={dates}>
    <ShareUsage data={data} sort={sortLabel} />
    <Stack>
      <Row split="tiles">
        <MetricTile label={HOME_METRICS.requests.label} hint={HOME_METRICS.requests.hint} icon={<Activity />} value={c.requests} delta={change(c.requests, p.requests)} points={series.map((d) => d.requests)} format={formatCompact} emphasis />
        <MetricTile label={HOME_METRICS.errorRate.label} hint={HOME_METRICS.errorRate.hint} icon={<AlertTriangle />} value={c.errorRate} delta={change(c.errorRate, p.errorRate)} intent="down" points={series.map((d) => (d.requests ? d.errors / d.requests : 0))} format={(n) => formatPercent(n, 2)} />
        <MetricTile label={HOME_METRICS.p95.label} hint={HOME_METRICS.p95.hint} icon={<Gauge />} value={c.p95} delta={change(c.p95, p.p95)} intent="down" points={series.map((d) => d.p95)} format={(n) => formatDuration(n)} />
        <MetricTile label={HOME_METRICS.revenue.label} hint={HOME_METRICS.revenue.hint} icon={<CircleDollarSign />} value={c.revenue} delta={change(c.revenue, p.revenue)} intent="neutral" points={series.map((d) => d.revenue)} format={(n) => formatCost(n)} />
      </Row>
      <Row>
        <Card>
          <CardHeader
            title="When requests come"
            description="Requests by weekday and hour, UTC, over the last 30 complete days."
            actions={<Badge tone="accent">Busiest: {DAYS[peak.d].slice(0, 3)} {String(peak.h).padStart(2, '0')}:00</Badge>}
          />
          <CardBody>
            <Heatmap values={heat} label="Requests by weekday and hour" format={formatCompact} />
          </CardBody>
        </Card>
      </Row>
      <Row split="1/2">
        <Card>
          <CardHeader title="By hour of day" description={`Every weekday summed. The busiest hour is ${peakHour.label} UTC.`} />
          <CardBody>
            <ColumnChart columns={hours} highlight={peakHour.key} format={formatCompact} axisFormat={AXIS_FORMATTERS.count} label="Requests by hour of day" labelEvery={6} height={220} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By region" description="Share of requests, with median latency" />
          <CardBody className="flex flex-col">
            {/* Four rows spread over the card's height, so it ends level with the chart beside it. */}
            <BarList
              className="flex-1 justify-around"
              label="Requests by region"
              highlight={regions[0].label}
              format={formatCompact}
              items={regions.map((r) => ({ key: r.label, label: <span className="font-mono text-xs">{r.label}</span>, value: r.value, meta: `p50 ${formatDuration(r.p50)}` }))}
            />
          </CardBody>
        </Card>
      </Row>
      <Row split="1/2">
        <Card>
          <CardHeader title="Requests per day" description="Point at a day: the errors beside it and the figures above follow." />
          <CardBody>
            <TrendChart label="Requests per day" height={220} dates={dates} series={[{ key: 'r', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Errors per day" description="5xx and 429 responses" actions={<AskErrors />} />
          <CardBody>
            <ColumnChart
              label="Errors per day"
              height={220}
              dates={dates}
              format={formatCompact}
              axisFormat={AXIS_FORMATTERS.count}
              highlight={series.reduce((m, d) => (d.errors > m.errors ? d : m)).date}
              columns={series.map((d) => ({ key: d.date, label: formatDate(d.date).replace(/,? \d{4}$/, ''), value: d.errors }))}
            />
          </CardBody>
        </Card>
      </Row>
      <Row>
        <Card className="overflow-hidden">
          <CardHeader title="Endpoints" description="Sorted by latency p95; select a heading to sort by it." divided />
          <Table caption="Endpoints by requests, error rate and latency">
            <TableHead>
              <tr>
                <TableHeader grow>Endpoint</TableHeader>
                <TableHeader align="right" {...by('requests')}>Requests</TableHeader>
                <TableHeader align="right" hideBelow="sm" {...by('errorRate')}>Error rate</TableHeader>
                <TableHeader align="right" {...by('p95')}>p95</TableHeader>
                <TableHeader hideBelow="md" className="w-48">Latency</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.route}>
                  <TableCell>
                    <RouteCell method={e.method} route={e.route} wrap />
                  </TableCell>
                  <TableCell align="right" numeric>{formatCompact(e.requests)}</TableCell>
                  <TableCell align="right" numeric hideBelow="sm" className={cn(e.errorRate > 0.01 && 'text-critical-ink')}>{formatPercent(e.errorRate, 2)}</TableCell>
                  <TableCell align="right" numeric className={cn(e.p95 > 1000 && 'font-medium text-warning-ink')}>{formatDuration(e.p95)}</TableCell>
                  <TableCell hideBelow="md">
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-fill-track">
                      <span className={cn('grow-x block h-full rounded-full', e.p95 === maxP95 ? 'bg-accent' : 'bg-chart-neutral-strong')} style={{ width: `${(e.p95 / maxP95) * 100}%` }} />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Row>
    </Stack>
    </Meridian>
  );
}

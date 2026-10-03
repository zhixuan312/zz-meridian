'use client';

import { useState } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type SortDirection } from '@/components/ui/table';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart, type Column } from '@/components/charts/column-chart';
import { Heatmap } from '@/components/charts/heatmap';
import { BarList } from '@/components/charts/bar-list';
import { cn } from '@/lib/cn';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { CompositionBar } from '@/components/charts/composition-bar';
import type { DailyPoint, Endpoint } from '@/system/fixtures/relay';
import { RouteCell } from '@/views/requests';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The Analytics page's body: when traffic comes, where from, and what is slow. */
export function AnalyticsBody({
  series,
  heat,
  hours,
  regions,
  endpoints,
}: {
  series: DailyPoint[];
  heat: number[][];
  hours: Column[];
  regions: { label: string; value: number; p50: number }[];
  endpoints: Endpoint[];
}) {
  const dates = series.map((d) => d.date);
  const peak = heat.flatMap((row, d) => row.map((v, h) => ({ v, d, h }))).reduce((m, c) => (c.v > m.v ? c : m));
  const peakHour = hours.reduce((m, c) => (c.value > m.value ? c : m));
  const [sort, setSort] = useState<{ key: 'requests' | 'errorRate' | 'p95'; dir: Exclude<SortDirection, false> }>({ key: 'p95', dir: 'desc' });
  const rows = [...endpoints].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (a[sort.key] - b[sort.key]));
  const maxP95 = Math.max(...endpoints.map((e) => e.p95));
  const by = (key: typeof sort.key) => ({
    sort: sort.key === key ? sort.dir : (false as const),
    onSort: () => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })),
  });
  return (
    <Stack>
      <Row>
        <Card>
          <CardHeader
            title="When requests come"
            description="Requests by weekday and hour, UTC, summed over the period."
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
            <ColumnChart columns={hours} highlight={peakHour.key} format={formatCompact} axisFormat={formatCompact} label="Requests by hour of day" height={220} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By region" description="Requests in the period, with median latency" />
          <CardBody className="flex flex-col gap-8">
            <BarList
              label="Requests by region"
              highlight={regions[0].label}
              format={formatCompact}
              items={regions.map((r) => ({ key: r.label, label: <span className="font-mono text-xs">{r.label}</span>, value: r.value, meta: `p50 ${formatDuration(r.p50)}` }))}
            />
            <div className="mt-auto border-t border-line pt-5">
              <p className="t-eyebrow mb-3">Share of requests</p>
              <CompositionBar label="Share of requests by region" format={formatCompact} parts={regions.map((r, i) => ({ label: r.label, value: r.value, color: i + 1 }))} />
            </div>
          </CardBody>
        </Card>
      </Row>
      <Meridian dates={dates}>
        <Row split="1/2">
          <Card>
            <CardHeader title="Requests per day" description="Point at a day: the errors beside it follow." />
            <CardBody>
              <TrendChart label="Requests per day" height={220} dates={dates} series={[{ key: 'r', label: 'Requests', values: series.map((d) => d.requests), kind: 'area' }]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Errors per day" description="5xx and 429 responses" />
            <CardBody>
              <ColumnChart
                label="Errors per day"
                height={220}
                dates={dates}
                format={formatCompact}
                axisFormat={formatCompact}
                highlight={series.reduce((m, d) => (d.errors > m.errors ? d : m)).date}
                columns={series.map((d) => ({ key: d.date, label: formatDate(d.date).replace(/,? \d{4}$/, ''), value: d.errors }))}
              />
            </CardBody>
          </Card>
        </Row>
      </Meridian>
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
                  <TableCell truncate>
                    <RouteCell method={e.method} route={e.route} />
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
  );
}

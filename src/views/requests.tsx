'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { DEMO_NOW, DEMO_UPDATED_AT, REGIONS, type RequestRow } from '@/system/fixtures/sample';
import { STATUS_TEXT, statusClass, statusTone } from '@/system/fixtures/sample-records';

/** The filters, kept in the address: an agent opens this exact view with the same names as tool arguments. */
export const REQUEST_FILTERS = { q: '', status: 'all', method: 'all', region: 'all', by: '' };

export function filterRequests(rows: RequestRow[], f: typeof REQUEST_FILTERS) {
  const q = f.q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.status === 'all' || statusClass(r.status) === f.status) &&
      (f.method === 'all' || r.method === f.method) &&
      (f.region === 'all' || r.region === f.region) &&
      (!q || r.id.includes(q) || r.route.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q)),
  );
}

export const formatBytes = (b: number) => (b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : b >= 1000 ? `${Math.round(b / 1000)} KB` : `${b} B`);

export function StatusBadge({ status }: { status: number }) {
  return (
    <Badge tone={statusTone(status)} dot className="t-num">
      {status} <span className="max-xl:hidden">{STATUS_TEXT[status]}</span>
    </Badge>
  );
}

/** An HTTP method as a quiet chip of fixed width, so the routes beside it line up in one column. */
export function MethodChip({ method }: { method: string }) {
  return <span className="inline-flex h-5 w-13 shrink-0 items-center justify-center rounded-xs bg-fill-track font-mono text-2xs tracking-[0.04em] text-ink-2">{method}</span>;
}

export function RouteCell({ method, route }: { method: string; route: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <MethodChip method={method} />
      <span className="truncate font-mono text-xs text-ink">{route}</span>
    </span>
  );
}

export const requestColumns: Column<RequestRow>[] = [
  {
    key: 'request', header: 'Request', grow: true, truncate: true, mobile: 'title',
    cell: (r) => <RouteCell method={r.method} route={r.route} />,
    sortValue: (r) => r.route,
  },
  { key: 'status', header: 'Status', mobile: 'status', cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
  {
    key: 'latency', header: 'Latency', numeric: true, mobile: 'fact', sortValue: (r) => r.latency,
    cell: (r) => <span className={r.latency > 1000 ? 'font-medium text-warning-ink' : undefined}>{formatDuration(r.latency)}</span>,
  },
  { key: 'customer', header: 'Customer', muted: true, mobile: 'fact', hideBelow: 'md', cell: (r) => <span className="whitespace-nowrap">{r.customer}</span>, sortValue: (r) => r.customer },
  { key: 'region', header: 'Region', muted: true, hideBelow: 'lg', cell: (r) => <span className="font-mono text-xs whitespace-nowrap">{r.region}</span> },
  { key: 'size', header: 'Size', numeric: true, muted: true, hideBelow: 'xl', cell: (r) => formatBytes(r.bytes), sortValue: (r) => r.bytes },
  {
    key: 'at', header: 'Received', numeric: true, muted: true, mobile: 'fact', sortValue: (r) => r.at,
    cell: (r) => <time dateTime={r.at} title={formatDateTime(r.at)}>{formatRelative(r.at, DEMO_NOW)}</time>,
  },
];

const options = (all: string, values: string[]) => [{ value: 'all', label: all }, ...values.map((v) => ({ value: v, label: v }))];

export function RequestsView({ rows }: { rows: RequestRow[] }) {
  /* One state for filters, sort and page: two setters in one handler would each write over the other. */
  const [f, setF] = useQueryState({ ...REQUEST_FILTERS, sort: 'at', dir: 'desc', page: '1' });
  const matching = useMemo(() => filterRequests(rows, f), [rows, f]);
  const errors = matching.filter((r) => r.status >= 500 || r.status === 429).length;
  const p95 = useMemo(() => {
    const s = matching.map((r) => r.latency).sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) * 0.95)] : 0;
  }, [matching]);
  /* Twelve 5-minute buckets, oldest first: the shape behind each tile, and the last half hour against the one before. */
  const buckets = useMemo(() => {
    const B = 12, W = 5 * 60_000, end = DEMO_NOW.getTime();
    const out = Array.from({ length: B }, () => [] as RequestRow[]);
    for (const r of matching) {
      const i = B - 1 - Math.floor((end - new Date(r.at).getTime()) / W);
      if (i >= 0 && i < B) out[i].push(r);
    }
    const p95of = (rs: RequestRow[]) => { const l = rs.map((r) => r.latency).sort((a, b) => a - b); return l.length ? l[Math.floor((l.length - 1) * 0.95)] : 0; };
    const errOf = (rs: RequestRow[]) => (rs.length ? rs.filter((r) => r.status >= 500 || r.status === 429).length / rs.length : 0);
    const half = (f: (rs: RequestRow[]) => number, a: number, b: number) => f(out.slice(a, b).flat());
    const ch = (now: number, before: number) => (before ? now / before - 1 : null);
    return {
      count: out.map((b) => b.length), errors: out.map(errOf), p95: out.map(p95of),
      dCount: ch(half((r) => r.length, 6, 12), half((r) => r.length, 0, 6)),
      dErr: ch(half(errOf, 6, 12), half(errOf, 0, 6)),
      dP95: ch(half(p95of, 6, 12), half(p95of, 0, 6)),
    };
  }, [matching]);
  const isFiltered = f.q !== '' || f.status !== 'all' || f.method !== 'all' || f.region !== 'all';
  const change = (patch: Partial<typeof REQUEST_FILTERS>) => setF({ ...patch, by: '', page: '1' });
  const clear = () => setF({ ...REQUEST_FILTERS, page: '1' });

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Requests"
      description="Every call that reached the gateway, newest first. Open one to see where its time went."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<Button icon={<Download />}>Export CSV</Button>}
    >
      <Stack>
        <Row split="tiles">
          <MetricTile label={isFiltered ? 'Matching requests' : 'Requests'} value={matching.length} format={formatCompact} daily={buckets.count} delta={buckets.dCount} intent="neutral" hint="Requests that match the filters below. The line shows them in 5-minute steps; the change compares the last half hour with the one before." />
          <MetricTile label="Errors and limits" value={matching.length ? errors / matching.length : 0} format={(n) => formatPercent(n, 1)} daily={buckets.errors} delta={buckets.dErr} intent="down" hint="Share answered with a 5xx or a 429." />
          <MetricTile label="Latency p95" value={p95} format={formatDuration} daily={buckets.p95} delta={buckets.dP95} intent="down" hint="95 of every 100 matching requests finished faster than this." />
        </Row>
        <DataTable
          caption="Requests"
          noun="requests"
          rows={matching}
          columns={requestColumns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/requests/${r.id}`}
          state={{ sort: f.sort, dir: f.dir, page: f.page }}
          onStateChange={setF}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              search={{ value: f.q, onChange: (q) => change({ q }), placeholder: 'Search requests' }}
              filters={[
                { key: 'status', label: 'Status', value: f.status, onChange: (status) => change({ status }), options: options('All', ['2xx', '3xx', '4xx', '5xx']) },
                { key: 'method', label: 'Method', value: f.method, onChange: (method) => change({ method }), options: options('All', ['GET', 'POST', 'PUT', 'DELETE']) },
                { key: 'region', label: 'Region', value: f.region, onChange: (region) => change({ region }), options: options('All', REGIONS.map((r) => r.label)) },
              ]}
              result={<>{matching.length.toLocaleString('en-US')} of {rows.length.toLocaleString('en-US')}</>}
              setBy={f.by || undefined}
              onClear={clear}
            />
          }
        />
      </Stack>
    </PageFrame>
  );
}

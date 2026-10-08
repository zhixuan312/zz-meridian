'use client';

/**
 * The sample's request cells and columns, shared by the Requests page, the Overview, Analytics, the Requests embed and
 * the Data table preview. They live here, not in a page view, so removing a sample page never breaks a preview.
 */
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Column } from '@/components/patterns/data-table';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { DEMO_NOW, type RequestRow } from '@/system/fixtures/sample';
import { STATUS_TEXT, statusTone } from '@/system/fixtures/sample-records';

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

/**
 * A method and its route. In a list whose rows are all different routes the route truncates; where the route is the
 * row's whole identity and the column is narrow (Analytics on a phone), `wrap` stacks the method over the route below 640px and lets the route break after a slash instead.
 */
export function RouteCell({ method, route, wrap }: { method: string; route: string; wrap?: boolean }) {
  return (
    <span className={cn('flex min-w-0', wrap ? 'flex-col items-start gap-1 sm:flex-row sm:gap-2.5' : 'items-center gap-2.5')}>
      <MethodChip method={method} />
      {wrap ? (
        <span className="min-w-0 font-mono text-xs leading-5 text-ink">
          {route.split('/').map((part, i) => (
            <Fragment key={i}>{i > 0 ? <>/<wbr /></> : null}{part}</Fragment>
          ))}
        </span>
      ) : (
        <span className="truncate font-mono text-xs text-ink">{route}</span>
      )}
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
  { key: 'customer', header: 'Customer', muted: true, mobile: 'fact', hideBelow: 'lg', cell: (r) => <span className="block max-w-48 truncate" title={r.customer}>{r.customer}</span>, sortValue: (r) => r.customer },
  { key: 'region', header: 'Region', muted: true, hideBelow: 'lg', cell: (r) => <span className="font-mono text-xs whitespace-nowrap">{r.region}</span> },
  { key: 'size', header: 'Size', numeric: true, muted: true, hideBelow: 'xl', cell: (r) => formatBytes(r.bytes), sortValue: (r) => r.bytes },
  {
    key: 'at', header: 'Received', numeric: true, muted: true, mobile: 'fact', sortValue: (r) => r.at,
    cell: (r) => <time dateTime={r.at} title={formatDateTime(r.at)}>{formatRelative(r.at, DEMO_NOW)}</time>,
  },
];

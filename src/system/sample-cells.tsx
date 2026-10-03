'use client';

/**
 * The sample's request cells and columns, shared by the Requests page, the Overview, Analytics, the Requests embed and
 * the Data table preview. They live here, not in a page view, so removing a sample page never breaks a preview.
 */
import { Badge } from '@/components/ui/badge';
import type { Column } from '@/components/patterns/data-table';
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

'use client';

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { AskAbout } from '@/components/patterns/ask-about';
import { DataTable, useQueryState } from '@/components/patterns/data-table';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { FilterBar } from '@/components/patterns/filter-bar';
import { Freshness } from '@/components/patterns/freshness';
import { formatDuration } from '@/lib/format';
import { formatRelative } from '@/lib/format-date';
import { DEMO_NOW, DEMO_UPDATED_AT, REGIONS, type RequestRow } from '@/system/fixtures/sample';
import { filterRequests, REQUEST_FILTERS } from '@/views/requests';
import { MethodChip, requestColumns, StatusBadge } from '@/system/sample-cells';

const describe = (f: typeof REQUEST_FILTERS) =>
  [f.status !== 'all' && `status ${f.status}`, f.method !== 'all' && f.method, f.region !== 'all' && `in ${f.region}`, f.q && `matching "${f.q}"`].filter(Boolean).join(', ');

export function EmbedRequests({ rows }: { rows: RequestRow[] }) {
  const s = useSurface();
  const [f, set] = useQueryState({ ...REQUEST_FILTERS, by: 'Claude', sort: 'at', dir: 'desc', page: '1' });
  const matching = useMemo(() => filterRequests(rows, f), [rows, f]);
  const scope = describe(f);
  const latest = matching.slice(0, 5);
  const query = new URLSearchParams(Object.entries(f).filter(([k, v]) => ['status', 'method', 'region', 'q'].includes(k) && v && v !== 'all')).toString();
  const consolePath = `/requests${query ? `?${query}` : ''}`;

  useShareView(
    `${matching.length} requests${scope ? ` with ${scope}` : ''}. Latest: ${latest.map((r) => `${r.method} ${r.route} ${r.status} in ${r.latency}ms (${r.id})`).join('; ') || 'none'}.`,
    { view: 'requests', filters: { status: f.status, method: f.method, region: f.region, q: f.q }, total: matching.length, latest: latest.map((r) => r.id) },
  );

  if (s.mode === 'fullscreen') {
    const clear = () => set({ ...REQUEST_FILTERS, by: '', page: '1' });
    const change = (patch: Partial<typeof REQUEST_FILTERS>) => set({ ...patch, by: '', page: '1' });
    const opts = (vals: string[]) => [{ value: 'all', label: 'All' }, ...vals.map((v) => ({ value: v, label: v }))];
    return (
      <EmbedFrame title="Requests" meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />} consolePath={consolePath}>
        <DataTable
          caption="Requests"
          noun="requests"
          rows={matching}
          columns={requestColumns}
          rowKey={(r) => r.id}
          state={{ sort: f.sort, dir: f.dir, page: f.page }}
          onStateChange={set}
          filtered={matching.length < rows.length}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              search={{ value: f.q, onChange: (q) => change({ q }), placeholder: 'Search requests' }}
              filters={[
                { key: 'status', label: 'Status', value: f.status, onChange: (status) => change({ status }), options: opts(['2xx', '3xx', '4xx', '5xx']) },
                { key: 'method', label: 'Method', value: f.method, onChange: (method) => change({ method }), options: opts(['GET', 'POST', 'PUT', 'DELETE']) },
                { key: 'region', label: 'Region', value: f.region, onChange: (region) => change({ region }), options: opts(REGIONS.map((r) => r.label)) },
              ]}
              result={<>{matching.length} of {rows.length}</>}
              setBy={f.by || undefined}
              onClear={clear}
            />
          }
        />
      </EmbedFrame>
    );
  }

  return (
    <EmbedFrame
      title={scope ? `Requests · ${scope}` : 'Latest requests'}
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      consolePath={consolePath}
      expandable={matching.length > latest.length}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <p className="t-num min-w-0 flex-1 text-xs text-ink-3">
            <span className="font-medium text-ink">{matching.length}</span> matching · showing the latest {latest.length}
          </p>
          {latest.length ? <AskAbout question={`Why are these ${scope ? scope + ' ' : ''}requests failing, and what do they have in common?`} /> : null}
        </div>
        {latest.length === 0 ? (
          <EmptyState kind="filtered" layout="inline" title="No requests match" className="px-4 py-4">The tool asked for {scope || 'everything'}; nothing arrived in the last hour.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => s.openLink(`/requests/${r.id}`)}
                  className="group flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill-hover"
                >
                  <MethodChip method={r.method} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-ink">{r.route}</span>
                    <span className="t-num mt-0.5 block truncate text-xs text-ink-3">{r.customer} · {formatRelative(r.at, DEMO_NOW)}</span>
                  </span>
                  <span className={`t-num shrink-0 text-xs ${r.latency > 1000 ? 'font-medium text-warning-ink' : 'text-ink-2'}`}>{formatDuration(r.latency)}</span>
                  <StatusBadge status={r.status} />
                  <ChevronRight className="size-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </EmbedFrame>
  );
}

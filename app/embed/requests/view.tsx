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
import { REGIONS } from '@/data/sample';
import { describeFilters, requestsContext, type RequestsData } from '@/views/requests-context';
import { activeFilters, options, REQUEST_FILTERS, REQUEST_METHODS, useSearchDraft } from '@/views/requests';
import { MethodChip, requestColumns, StatusBadge } from '@/system/sample-cells';

/** A person's change replaces the tool's `by`: the default must be a value a write can differ from, because a key at its default is dropped from the address. */
const PERSON = 'you';

/** The server filtered, sorted and paged: `rows` is one page of the matching set, `total` how many match. */
export function EmbedRequests(data: RequestsData) {
  const { rows, total, state, pageSize, now } = data;
  const asOf = useMemo(() => new Date(now), [now]);
  const updatedAt = useMemo(() => new Date(data.updatedAt), [data.updatedAt]);
  const s = useSurface();
  const [f, set] = useQueryState({ ...REQUEST_FILTERS, by: 'Claude', sort: 'at', dir: 'desc', page: '1' });
  const [draft, setDraft] = useSearchDraft(state.q, (q) => set({ q, by: PERSON, page: '1' }));
  const isFiltered = state.q !== '' || state.status !== 'all' || state.method !== 'all' || state.region !== 'all';
  const scope = describeFilters(state);
  const latest = rows.slice(0, 5);
  const query = new URLSearchParams(activeFilters(state)).toString();
  const consolePath = `/requests${query ? `?${query}` : ''}`;

  useShareView(requestsContext(data, s.mode === 'fullscreen' ? rows.length : latest.length));

  if (s.mode === 'fullscreen') {
    const clear = () => { setDraft(''); set({ ...REQUEST_FILTERS, by: PERSON, page: '1' }); };
    const change = (patch: Partial<typeof REQUEST_FILTERS>) => set({ ...patch, by: PERSON, page: '1' });
    return (
      <EmbedFrame title="Requests" meta={<Freshness updatedAt={updatedAt} now={asOf} />} consolePath={consolePath}>
        <DataTable
          caption="Requests"
          noun="requests"
          rows={rows}
          columns={requestColumns}
          rowKey={(r) => r.id}
          manual
          total={total}
          pageSize={pageSize}
          pageSizes={[pageSize]}
          state={{ sort: state.sort, dir: state.dir, page: String(state.page) }}
          onStateChange={set}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
              search={{ value: draft, onChange: setDraft, placeholder: 'Search requests' }}
              filters={[
                { key: 'status', label: 'Status', value: state.status, onChange: (status) => change({ status }), options: options('All', ['2xx', '3xx', '4xx', '5xx']) },
                { key: 'method', label: 'Method', value: state.method, onChange: (method) => change({ method }), options: options('All', REQUEST_METHODS) },
                { key: 'region', label: 'Region', value: state.region, onChange: (region) => change({ region }), options: options('All', REGIONS.map((r) => r.label)) },
              ]}
              result={<>{total.toLocaleString('en-US')} {isFiltered ? 'matching' : 'requests'}</>}
              setBy={f.by === 'Claude' ? 'Claude' : undefined}
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
      meta={<Freshness updatedAt={updatedAt} now={asOf} />}
      consolePath={consolePath}
      expandable={total > latest.length}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <p className="t-num min-w-0 flex-1 text-xs text-ink-3">
            <span className="font-medium text-ink">{total}</span> matching · showing the latest {latest.length}
          </p>
          {latest.length ? <AskAbout question={`Why are these ${scope ? scope + ' ' : ''}requests failing, and what do they have in common?`} /> : null}
        </div>
        {latest.length === 0 ? (
          <EmptyState kind="filtered" layout="inline" title="No requests match" className="px-4 py-4">The tool asked for {scope || 'everything'}; nothing matched.</EmptyState>
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
                    <span className="t-num mt-0.5 block truncate text-xs text-ink-3">{r.customer} · {formatRelative(r.at, asOf)}</span>
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

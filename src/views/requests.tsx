'use client';

import { useEffect, useState } from 'react';
import { Row, Stack } from '@/components/base/shell';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { REGIONS, type RequestRow } from '@/data/sample';
import { REQUEST_METHODS } from '@/data/request-methods';
import type { readRequests } from '@/data/requests';
import { useShareView } from '@/components/base/use-share-view';
import { AskAbout } from '@/components/patterns/ask-about';
import { REQUEST_METRICS, describeFilters, requestsContext } from './requests-context';
import { requestColumns } from '@/system/sample-cells';

type Page = Awaited<ReturnType<typeof readRequests>>;

/** The filters, kept in the address: an agent opens this exact view with the same names as tool arguments. */
export const REQUEST_FILTERS = { q: '', status: 'all', method: 'all', region: 'all', by: '' };

export const options = (all: string, values: string[]) => [{ value: 'all', label: all }, ...values.map((v) => ({ value: v, label: v }))];
/** The methods the log holds, as the filter offers them. */
const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'];
export { REQUEST_METHODS };

/** The filters that are set, as address parameters: what the export and "Open in the console" carry. */
export const activeFilters = (f: Pick<Page['state'], 'q' | 'status' | 'method' | 'region'>): Record<string, string> =>
  Object.fromEntries(Object.entries({ q: f.q, status: f.status, method: f.method, region: f.region }).filter(([, v]) => v && v !== 'all'));

/** What the search box shows while a person types, and when it writes the address: not on every key, so the server is asked once. */
export function useSearchDraft(applied: string, write: (q: string) => void): [string, (q: string) => void] {
  const [draft, setDraft] = useState(applied);
  const [seen, setSeen] = useState(applied);
  if (seen !== applied) {
    setSeen(applied);
    setDraft(applied);
  }
  useEffect(() => {
    if (draft === applied) return;
    const t = setTimeout(() => write(draft), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  return [draft, setDraft];
}

/** The page's body under its masthead: the tiles and the table. The server filtered, sorted and paged, `pageSize` rows at a time. */
export function RequestsView({ rows, total, summary, state, pageSize, updatedAt, now }: { rows: RequestRow[]; total: number; summary: Page['summary']; state: Page['state']; pageSize: number; updatedAt: string; now: string }) {
  useShareView(requestsContext({ rows, total, summary, state, pageSize, updatedAt, now }));
  /* One writer for filters, sort and page: two setters in one handler would each write over the other. */
  const [f, setF, pending] = useQueryState({ ...REQUEST_FILTERS, sort: 'at', dir: 'desc', page: '1' });
  const isFiltered = state.q !== '' || state.status !== 'all' || state.method !== 'all' || state.region !== 'all';
  const change = (patch: Partial<typeof REQUEST_FILTERS>) => setF({ ...patch, by: '', page: '1' });
  const [draft, setDraft] = useSearchDraft(state.q, (q) => change({ q }));
  const clear = () => { setDraft(''); setF({ ...REQUEST_FILTERS, page: '1' }); };
  const { buckets, deltas } = summary;
  const note = summary.partial ? ' Worked out from the newest 500 of them.' : '';

  return (
    <Stack>
      <Row split="tiles">
        <MetricTile label={isFiltered ? REQUEST_METRICS.count.filtered : REQUEST_METRICS.count.label} value={summary.count} format={formatCompact} daily={buckets.count} delta={deltas.count} compare="vs the half hour before" intent="neutral" hint={`${REQUEST_METRICS.count.hint}${note}`} />
        <MetricTile label={REQUEST_METRICS.errors.label} value={summary.errorShare} format={(n) => formatPercent(n, 1)} daily={buckets.errors} delta={deltas.errors} compare="vs the half hour before" intent="down" hint={`${REQUEST_METRICS.errors.hint}${note}`} />
        <MetricTile label={REQUEST_METRICS.p95.label} value={summary.p95} format={formatDuration} daily={buckets.p95} delta={deltas.p95} compare="vs the half hour before" intent="down" hint={`${REQUEST_METRICS.p95.hint}${note}`} />
      </Row>
      <DataTable
        caption="Requests"
        noun="requests"
        rows={rows}
        columns={requestColumns}
        rowKey={(r) => r.id}
        rowHref={(r) => `/requests/${r.id}`}
        manual
        total={total}
        pageSizes={[pageSize]}
        state={{ sort: f.sort, dir: f.dir, page: f.page }}
        onStateChange={setF}
        busy={pending}
        filtered={isFiltered}
        onClearFilters={clear}
        toolbar={
          <FilterBar
            ask={<AskAbout question={isFiltered ? `What do these requests with ${describeFilters(state)} have in common, and why?` : 'What stands out in the latest requests, and why?'} />}
            search={{ value: draft, onChange: setDraft, placeholder: 'Search requests' }}
            filters={[
              { key: 'status', label: 'Status', value: state.status, onChange: (status) => change({ status }), options: options('All', STATUS_CLASSES) },
              { key: 'method', label: 'Method', value: state.method, onChange: (method) => change({ method }), options: options('All', REQUEST_METHODS) },
              { key: 'region', label: 'Region', value: state.region, onChange: (region) => change({ region }), options: options('All', REGIONS.map((r) => r.label)) },
            ]}
            result={<>{total.toLocaleString('en-US')} {isFiltered ? 'matching' : 'requests'}</>}
            setBy={f.by || undefined}
            onClear={clear}
          />
        }
      />
    </Stack>
  );
}

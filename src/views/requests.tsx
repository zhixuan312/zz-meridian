'use client';

import { useEffect, useMemo, useState } from 'react';
import { app } from '@/app.config';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { ExportButton } from '@/components/patterns/export-button';
import { DataTable, useQueryState } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { DEMO_UPDATED_AT, ENDPOINTS, REGIONS, type RequestRow } from '@/data/sample';
import type { readRequests } from '@/data/requests';
import { requestColumns } from '@/system/sample-cells';

type Page = Awaited<ReturnType<typeof readRequests>>;

/** The filters, kept in the address: an agent opens this exact view with the same names as tool arguments. */
export const REQUEST_FILTERS = { q: '', status: 'all', method: 'all', region: 'all', by: '' };

export const options = (all: string, values: string[]) => [{ value: 'all', label: all }, ...values.map((v) => ({ value: v, label: v }))];
/** The methods the log holds, as the filter offers them. */
const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'];
export const REQUEST_METHODS = [...new Set(ENDPOINTS.map((e) => e.method))];

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

/** `now` is when the rows were read, the data's clock: the freshness stamp counts from it. The server filtered, sorted and paged, `pageSize` rows at a time. */
export function RequestsView({ rows, total, summary, state, pageSize, now }: { rows: RequestRow[]; total: number; summary: Page['summary']; state: Page['state']; pageSize: number; now: string }) {
  const asOf = useMemo(() => new Date(now), [now]);
  /* One writer for filters, sort and page: two setters in one handler would each write over the other. */
  const [f, setF] = useQueryState({ ...REQUEST_FILTERS, sort: 'at', dir: 'desc', page: '1' });
  const isFiltered = state.q !== '' || state.status !== 'all' || state.method !== 'all' || state.region !== 'all';
  const change = (patch: Partial<typeof REQUEST_FILTERS>) => setF({ ...patch, by: '', page: '1' });
  const [draft, setDraft] = useSearchDraft(state.q, (q) => change({ q }));
  const clear = () => { setDraft(''); setF({ ...REQUEST_FILTERS, page: '1' }); };
  const { buckets, deltas } = summary;
  const filters = activeFilters(state);
  const note = summary.partial ? ' Worked out from the newest 500 of them.' : '';

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Requests"
      description="Every call that reached the gateway, newest first. Open one to see where its time went."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={asOf} />}
      actions={
        <ExportButton
          label="Export CSV"
          noun="requests"
          filename={`requests${state.status !== 'all' ? `-${state.status}` : ''}${state.method !== 'all' ? `-${state.method.toLowerCase()}` : ''}${state.region !== 'all' ? `-${state.region}` : ''}.csv`}
          href={`/api/export/requests?${new URLSearchParams({ ...filters, sort: state.sort, dir: state.dir })}`}
        />
      }
    >
      <Stack>
        <Row split="tiles">
          <MetricTile label={isFiltered ? 'Matching requests' : 'Requests'} value={summary.count} format={formatCompact} daily={buckets.count} delta={deltas.count} compare="vs the half hour before" intent="neutral" hint={`Requests that match the filters below. The line shows them in 5-minute steps; the change compares the last half hour with the one before.${note}`} />
          <MetricTile label="Errors and limits" value={summary.errorShare} format={(n) => formatPercent(n, 1)} daily={buckets.errors} delta={deltas.errors} compare="vs the half hour before" intent="down" hint={`Share answered with a 5xx or a 429.${note}`} />
          <MetricTile label="Latency p95" value={summary.p95} format={formatDuration} daily={buckets.p95} delta={deltas.p95} compare="vs the half hour before" intent="down" hint={`95 of every 100 matching requests finished faster than this.${note}`} />
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
          state={{ sort: state.sort, dir: state.dir, page: String(state.page) }}
          onStateChange={setF}
          filtered={isFiltered}
          onClearFilters={clear}
          toolbar={
            <FilterBar
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
    </PageFrame>
  );
}

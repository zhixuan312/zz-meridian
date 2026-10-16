'use client';

import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, useSearchDraft } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { REGION_NAMES } from '@/data/sample';
import { REQUEST_METHODS } from '@/data/request-methods';
import type { LoggedRequest, readRequests } from '@/data/requests';
import { useShareView } from '@/components/base/use-share-view';
import { Records } from '@/components/templates/records';
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

/** The page's body under its masthead: the tiles and the table. The server filtered, sorted and paged, `pageSize` rows at a time. */
export function RequestsView({ rows, total, summary, state, pageSize, updatedAt, now }: { rows: LoggedRequest[]; total: number; summary: Page['summary']; state: Page['state']; pageSize: number; updatedAt: string; now: string }) {
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
    <Records
      summary={
        <>
          {/* The count takes the same intent the same measure takes on Home and Usage: this product bills for what goes through it, so more of it is the business. A volume read as neither good nor bad on one page and as good on two others is one measure with two meanings. */}
          <MetricTile label={isFiltered ? REQUEST_METRICS.count.filtered : REQUEST_METRICS.count.label} value={summary.count} format={formatCompact} points={buckets.count} delta={deltas.count} compare="vs the half hour before" intent="up" hint={`${REQUEST_METRICS.count.hint}${note}`} />
          <MetricTile label={REQUEST_METRICS.errors.label} value={summary.errorShare ?? '—'} format={(n) => formatPercent(n, 1)} points={buckets.errors} delta={deltas.errors} compare="vs the half hour before" intent="down" hint={`${REQUEST_METRICS.errors.hint}${note}`} />
          <MetricTile label={REQUEST_METRICS.p95.label} value={summary.p95 ?? '—'} format={formatDuration} points={buckets.p95} delta={deltas.p95} compare="vs the half hour before" intent="down" hint={`${REQUEST_METRICS.p95.hint}${note}`} />
        </>
      }
    >
      {/* The page's protagonist, the request log, marked on a wrapper whose display is `contents`. */}
      <div data-protagonist="The request log" className="contents">
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
                { key: 'region', label: 'Region', value: state.region, onChange: (region) => change({ region }), options: options('All', REGION_NAMES) },
              ]}
              result={<>{total.toLocaleString('en-US')} {isFiltered ? 'matching' : 'requests'}</>}
              setBy={f.by || undefined}
              onClear={clear}
            />
          }
        />
      </div>
    </Records>
  );
}

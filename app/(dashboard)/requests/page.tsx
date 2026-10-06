import { Suspense, cache } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { readRequests, requestsQuery, REQUEST_PAGE } from '@/data/requests';
import { DEMO_UPDATED_AT } from '@/data/sample';
import { RequestsView } from '@/views/requests';
import { Busy, TableSkeleton, TilesSkeleton } from '../_loading';

export const metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The request log. Filters, sort and page live in the address (?status=5xx&sort=latency): the server reads one page of the filtered set, so every view is a link.
 * The masthead's title is static and sits outside every boundary that reads the address, so a navigation shows it at once; the freshness stamp, the export and the body each read the address inside their own.
 */
export default function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Requests"
      description="Every call that reached the gateway, newest first. Open one to see where its time went."
      meta={<Suspense fallback={<span className="inline-block h-4 w-28" />}><RequestsFreshness searchParams={searchParams} /></Suspense>}
      actions={<Suspense fallback={<span className="inline-block h-9 w-32" />}><RequestsExport searchParams={searchParams} /></Suspense>}
    >
      <Suspense
        fallback={
          <Busy name="requests">
            <TilesSkeleton />
            <TableSkeleton rows={3} filters={false} />
          </Busy>
        }
      >
        <Requests searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

/** The three readers of the address share one read: the awaited address is the same object within a request. */
const readPage = cache(readRequests);

/** The stamp counts from when the rows were read, the data's clock. */
async function RequestsFreshness({ searchParams }: { searchParams: SearchParams }) {
  const { observedAt } = await readPage(await searchParams);
  return <Freshness updatedAt={DEMO_UPDATED_AT} now={new Date(observedAt)} />;
}

/** The export carries the filters and the sort the address sets; it needs the validated address, not the read. */
async function RequestsExport({ searchParams }: { searchParams: SearchParams }) {
  const { state } = requestsQuery(await searchParams);
  const { q, status, method, region } = state;
  const set = Object.entries({ q, status, method, region }).filter(([, v]) => v && v !== 'all');
  const params = new URLSearchParams({ ...Object.fromEntries(set), sort: state.sort, dir: state.dir });
  return (
    <ExportButton
      label="Export CSV"
      noun="requests"
      filename={`requests${status !== 'all' ? `-${status}` : ''}${method !== 'all' ? `-${method.toLowerCase()}` : ''}${region !== 'all' ? `-${region}` : ''}.csv`}
      href={`/api/export/requests?${params}`}
    />
  );
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const { rows, total, summary, state } = await readPage(await searchParams);
  return <RequestsView rows={rows} total={total} summary={summary} state={state} pageSize={REQUEST_PAGE} />;
}

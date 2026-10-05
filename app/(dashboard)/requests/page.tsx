import { Suspense } from 'react';
import { readRequests, REQUEST_PAGE } from '@/data/requests';
import { RequestsView } from '@/views/requests';

export const metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The request log. Filters, sort and page live in the address (?status=5xx&sort=latency): the server reads one page of the filtered set, so every view is a link. */
export default function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const { rows, total, summary, state, observedAt } = await readRequests(await searchParams);
  return <RequestsView rows={rows} total={total} summary={summary} state={state} pageSize={REQUEST_PAGE} now={observedAt} />;
}

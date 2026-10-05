import { Suspense } from 'react';
import { publicRows, REQUEST_PAGE, requestsQuery } from '@/data/requests';
import { read } from '@/data/read';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }`. The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 * Both read one page of the filtered set, and no summary.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const { state, query } = requestsQuery(await searchParams);
  const { rows, total, observedAt } = await read('requests', query);
  return <EmbedRequests rows={publicRows(rows)} total={total} state={state} pageSize={REQUEST_PAGE} now={observedAt} />;
}

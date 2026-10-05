import { Suspense } from 'react';
import { read } from '@/data/read';
import type { RequestRow } from '@/data/sample';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }`. The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 */
export default async function Page() {
  const { rows, observedAt } = await read('requests');
  return (
    <Suspense>
      <EmbedRequests rows={rows as RequestRow[]} now={observedAt} />
    </Suspense>
  );
}

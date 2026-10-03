import { Suspense } from 'react';
import { requests } from '@/data/collections';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }`. The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 */
export default async function Page() {
  const { rows } = await requests.query({});
  return (
    <Suspense>
      <EmbedRequests rows={rows} />
    </Suspense>
  );
}

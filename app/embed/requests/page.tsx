import { Suspense } from 'react';
import { REQUESTS } from '@/system/fixtures/sample';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }`. The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 */
export default function Page() {
  return (
    <Suspense>
      <EmbedRequests rows={REQUESTS} />
    </Suspense>
  );
}

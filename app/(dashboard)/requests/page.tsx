import { Suspense } from 'react';
import { REQUESTS } from '@/system/fixtures/relay';
import { RequestsView } from '@/views/requests';

export const metadata = { title: 'Requests' };

/** The request log. Filters, sort and page live in the address (?status=5xx&sort=latency), so every view is a link. */
export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsView rows={REQUESTS} />
    </Suspense>
  );
}

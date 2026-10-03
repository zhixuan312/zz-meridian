import { Suspense } from 'react';
import { requests } from '@/data/collections';
import { RequestsView } from '@/views/requests';

export const metadata = { title: 'Requests' };

/** The request log. Filters, sort and page live in the address (?status=5xx&sort=latency), so every view is a link. */
export default async function RequestsPage() {
  const { rows } = await requests.query({});
  return (
    <Suspense>
      <RequestsView rows={rows} />
    </Suspense>
  );
}

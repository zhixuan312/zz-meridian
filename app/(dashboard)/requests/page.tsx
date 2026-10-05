import { Suspense } from 'react';
import { read } from '@/data/read';
import type { RequestRow } from '@/data/sample';
import { RequestsView } from '@/views/requests';

export const metadata = { title: 'Requests' };

/** The request log. Filters, sort and page live in the address (?status=5xx&sort=latency), so every view is a link. */
export default async function RequestsPage() {
  const { rows, observedAt } = await read('requests');
  return (
    <Suspense>
      <RequestsView rows={rows as RequestRow[]} now={observedAt} />
    </Suspense>
  );
}

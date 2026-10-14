import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { RecordsSkeleton } from '@/components/templates/records';

/** Tickets on its way: three tiles over the table of tickets and its filters. */
export default function TicketsLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'tickets', title: 'Tickets' })}>
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

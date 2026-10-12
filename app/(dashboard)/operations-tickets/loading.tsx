import { LoadingPage } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

/** Operations tickets on its way: three tiles over the table of tickets and its filters. */
export default function TicketsLoading() {
  return (
    <LoadingPage name="Operations tickets" title="Operations tickets">
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

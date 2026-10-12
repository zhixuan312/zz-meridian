import { LoadingPage } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

/** Requests on its way: three tiles over a few table rows; the page's own fallback is the same, so a navigation does not jump. */
export default function RequestsLoading() {
  return (
    <LoadingPage name="requests" title="Requests">
      <RecordsSkeleton tiles={3} rows={3} filters={false} />
    </LoadingPage>
  );
}

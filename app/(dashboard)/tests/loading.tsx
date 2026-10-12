import { LoadingPage } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

/** Tests and verification on its way: three tiles over the table and its filters. */
export default function TestsLoading() {
  return (
    <LoadingPage name="Tests and verification" title="Tests and verification">
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

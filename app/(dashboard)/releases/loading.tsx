import { LoadingPage } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

/** Releases on its way: three tiles over the table and its filters. */
export default function ReleasesLoading() {
  return (
    <LoadingPage name="releases" title="Releases">
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

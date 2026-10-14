import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';
import { RecordsSkeleton } from '@/components/templates/records';

/** Releases on its way: three tiles over the table and its filters. */
export default function ReleasesLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'releases', title: 'Releases' })}>
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';
import { RecordsSkeleton } from '@/components/templates/records';

/** Tests on its way: three tiles over the table and its filters. */
export default function TestsLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'tests', title: 'Tests' })}>
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

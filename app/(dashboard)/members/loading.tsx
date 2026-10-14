import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { RecordsSkeleton } from '@/components/templates/records';

/** Members on its way: the table of people. */
export default function MembersLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'members', title: 'Members' })}>
      <RecordsSkeleton rows={7} filters={false} />
    </LoadingPage>
  );
}

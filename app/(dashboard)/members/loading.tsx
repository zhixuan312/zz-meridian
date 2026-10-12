import { LoadingPage, TableSkeleton } from '@/components/patterns/page-loading';

/** Members on its way: the table of people. */
export default function MembersLoading() {
  return (
    <LoadingPage name="members" title="Members">
      <TableSkeleton rows={7} filters={false} />
    </LoadingPage>
  );
}

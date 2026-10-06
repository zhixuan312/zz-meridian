import { LoadingPage, TableSkeleton } from '../_loading';

/** Members on its way: the table of people. */
export default function MembersLoading() {
  return (
    <LoadingPage name="members" title="Members">
      <TableSkeleton rows={7} filters={false} />
    </LoadingPage>
  );
}

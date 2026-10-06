import { LoadingPage, TableSkeleton, TilesSkeleton } from '../_loading';

/** Requests on its way: three tiles over a few table rows; the page's own fallback is the same, so a navigation does not jump. */
export default function RequestsLoading() {
  return (
    <LoadingPage name="requests" title="Requests">
      <TilesSkeleton />
      <TableSkeleton rows={3} filters={false} />
    </LoadingPage>
  );
}

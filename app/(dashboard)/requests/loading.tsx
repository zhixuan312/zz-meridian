import { LoadingPage, TableSkeleton, TilesSkeleton } from '../_loading';

/** Requests on its way: three tiles over the filterable log. */
export default function RequestsLoading() {
  return (
    <LoadingPage name="requests">
      <TilesSkeleton />
      <TableSkeleton rows={10} />
    </LoadingPage>
  );
}

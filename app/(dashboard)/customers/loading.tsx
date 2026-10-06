import { LoadingPage, TableSkeleton, TilesSkeleton } from '../_loading';

/** Customers on its way: three tiles over the filterable table. */
export default function CustomersLoading() {
  return (
    <LoadingPage name="customers" title="Customers">
      <TilesSkeleton />
      <TableSkeleton rows={8} />
    </LoadingPage>
  );
}

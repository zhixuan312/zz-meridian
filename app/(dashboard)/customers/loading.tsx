import { LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';

/** Customers on its way: three tiles over the filterable table. */
export default function CustomersLoading() {
  return (
    <LoadingPage name="customers" title="Customers">
      <TilesSkeleton />
      <TableSkeleton rows={8} />
    </LoadingPage>
  );
}

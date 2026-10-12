import { LoadingPage } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

/** Customers on its way: three tiles over the filterable table. */
export default function CustomersLoading() {
  return (
    <LoadingPage name="customers" title="Customers">
      <RecordsSkeleton tiles={3} rows={8} />
    </LoadingPage>
  );
}

import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage, TableSkeleton } from '../_loading';

/** API keys on its way: the table of keys, and the line about rotating them. */
export default function KeysLoading() {
  return (
    <LoadingPage name="API keys">
      <TableSkeleton rows={5} filters={false} />
      <Skeleton className="h-3 w-96 max-w-full" />
    </LoadingPage>
  );
}

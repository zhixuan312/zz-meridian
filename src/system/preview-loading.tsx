import { Busy } from '@/components/patterns/page-loading';
import { Skeleton } from '@/components/ui/skeleton';

/** A preview holds its place while its own code arrives, without importing another specimen. */
export function PreviewLoading() {
  return <Busy name="preview"><Skeleton className="h-48 w-full" /></Busy>;
}

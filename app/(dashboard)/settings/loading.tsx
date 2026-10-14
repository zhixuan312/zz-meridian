import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';

/** Settings on its way: a stack of sections, each a title, a sentence and its controls. */
export default function SettingsLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'settings', title: 'Settings' })} width="form">
      <div className="flex flex-col gap-14">
        {[2, 3, 1, 1].map((n, i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-96 max-w-full" />
            {Array.from({ length: n }, (_, j) => <Skeleton key={j} className="h-9 w-full max-w-lg rounded-md" />)}
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}

import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage } from '../_loading';

/** Settings on its way: a stack of sections, each a title, a sentence and its controls. */
export default function SettingsLoading() {
  return (
    <LoadingPage name="settings" title="Settings">
      <div className="flex flex-col gap-14">
        {[3, 4, 3, 2].map((n, i) => (
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

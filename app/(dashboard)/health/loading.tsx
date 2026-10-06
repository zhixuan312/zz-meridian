import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage } from '../_loading';

/** Health on its way: the uptime figure with its service grid, the service list and the past incidents. */
export default function HealthLoading() {
  return (
    <LoadingPage name="health" title="Health">
      <Row split="2/3">
        <Card className="min-h-[29rem] gap-4 p-(--card-pad)">
          <Skeleton className="h-2.5 w-48" />
          <Skeleton className="h-16 w-56 rounded-md" />
          <div className="mt-auto grid grid-cols-2 gap-2">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-9 rounded-md" />)}</div>
          <Skeleton className="h-8 w-full" />
        </Card>
        <Card className="gap-3 p-(--card-pad)">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </Card>
      </Row>
      {[0, 1].map((i) => (
        <Row key={i}>
          <Card className="gap-4 p-(--card-pad)">
            <Skeleton className="h-4 w-32" />
            {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-4" />)}
          </Card>
        </Row>
      ))}
    </LoadingPage>
  );
}

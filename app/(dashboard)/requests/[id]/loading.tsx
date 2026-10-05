import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton, LoadingPage } from '../../_loading';

/** A request on its way: the facts beside the trace, then the request and response bodies. */
export default function RequestLoading() {
  return (
    <LoadingPage name="request">
      <Row split="2/3">
        <Card className="gap-4 p-(--card-pad)">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3" />)}
        </Card>
        <Card className="gap-4 p-(--card-pad)">
          <Skeleton className="h-4 w-16" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6 rounded-md" />)}
        </Card>
      </Row>
      <Row split="1/2"><ChartSkeleton height="h-56" /><ChartSkeleton height="h-56" /></Row>
    </LoadingPage>
  );
}

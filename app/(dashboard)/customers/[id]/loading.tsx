import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage } from '@/components/patterns/page-loading';

/** A customer on its way: its facts beside its 14 days. */
export default function CustomerLoading() {
  return (
    <LoadingPage name="customer">
      <Row split="2/3">
        <Card className="gap-4 p-(--card-pad)">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3" />)}
        </Card>
        <Card className="gap-4 p-(--card-pad)">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full rounded-md" />
        </Card>
      </Row>
    </LoadingPage>
  );
}

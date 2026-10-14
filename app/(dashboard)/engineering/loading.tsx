import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingPage } from '@/components/patterns/page-loading';

/** Now on its way: the block its title's sentence will take, the service list and the open incident. */
export default function NowLoading() {
  return (
    <LoadingPage name="now" title="Now" sentence>
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

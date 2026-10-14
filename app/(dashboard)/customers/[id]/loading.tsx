import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { CustomerTrail, FactsRoom } from '@/views/customer';

/**
 * A customer on its way: the masthead as the page will have it (its trail, the block its title's sentence will take
 * and the room of its line of figures), then its parts' shapes: why it is worth opening, the three tiles, what it asks
 * for beside its latest requests. Its name is not known yet, so the heading says what the page is.
 */
export default function CustomerLoading() {
  return (
    <LoadingPage
      name="customer"
      title="Customer"
      sentence
      kicker={<CustomerTrail />}
      description={<FactsRoom><Skeleton className="my-[0.3lh] h-[0.4lh] w-96 max-w-full" /></FactsRoom>}
    >
      <Card className="gap-4 p-(--card-pad)">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-3 w-72 max-w-full" />
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3" />)}
        </div>
      </Card>
      <TilesSkeleton count={3} />
      <Row split="1/3">
        <ChartSkeleton height="h-40" />
        <TableSkeleton rows={5} filters={false} />
      </Row>
    </LoadingPage>
  );
}

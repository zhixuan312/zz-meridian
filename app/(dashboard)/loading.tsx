import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** A page on its way: skeletons in the shape of the rows that are coming, so nothing jumps when they arrive. */
export default function DashboardLoading() {
  return (
    <PageFrame kicker={<Skeleton className="h-2.5 w-32" />} title={<Skeleton className="mt-3 h-10 w-64 rounded-md" />} description={<Skeleton className="mt-2 h-3.5 w-96 max-w-full" />}>
      <div role="status" aria-label="Loading" className="contents">
        <Stack>
          <Row split="2/3">
            <Card className="min-h-[29rem] gap-4 p-(--card-pad)">
              <Skeleton className="h-2.5 w-40" />
              <Skeleton className="h-16 w-56 rounded-md" />
              <Skeleton className="h-3 w-80 max-w-full" />
              <Skeleton className="mt-auto h-56 w-full rounded-md" />
            </Card>
            <div className="flex flex-col gap-(--stack-gap)">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="flex-1 gap-3 p-(--card-pad)">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-32 rounded-md" />
                  <Skeleton className="mt-auto h-8 w-full" />
                </Card>
              ))}
            </div>
          </Row>
          <Row split="1/2">
            {[0, 1].map((i) => (
              <Card key={i} className="gap-4 p-(--card-pad)">
                <Skeleton className="h-4 w-40" />
                {[0, 1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-3" />)}
              </Card>
            ))}
          </Row>
        </Stack>
      </div>
    </PageFrame>
  );
}

import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LinesSkeleton, LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { PeriodActionsRoom } from '@/views/period-actions';

/** The eight parts of Revenue, in their shapes, the Featured metric's room first: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function RevenueSkeleton() {
  return (
    <>
      <Row split="2/3">
        <Card className="min-h-[29rem] gap-4 p-(--card-pad)">
          <Skeleton className="h-2.5 w-40" />
          <Skeleton className="h-16 w-56 rounded-md" />
          <Skeleton className="h-3 w-80 max-w-full" />
          <Skeleton className="mt-auto h-56 w-full rounded-md" />
        </Card>
        <div className="grid min-w-0 gap-(--stack-gap) md:grid-cols-3 lg:flex lg:flex-col">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex-1 gap-3 p-(--card-pad)">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="mt-auto h-8 w-full" />
            </Card>
          ))}
        </div>
      </Row>
      <Row split="2/3">
        <ChartSkeleton height="h-64" />
        <ChartSkeleton height="h-20" />
      </Row>
      <ChartSkeleton height="h-52" />
      <Card className="gap-4 p-(--card-pad)">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-80 max-w-full rounded-md" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </Card>
      <LinesSkeleton lines={8} />
      <LinesSkeleton />
      <Row split="1/2">
        <LinesSkeleton />
        <LinesSkeleton />
      </Row>
    </>
  );
}

/**
 * Revenue on its way: the masthead as the page will have it (its kicker, the room of the line under the title, the
 * freshness and where the period control and Export stand), then the eight parts' shapes.
 */
export default function RevenueLoading() {
  return (
    <LoadingPage
      {...gatedLoading({ name: 'revenue', title: 'Revenue' })}
      sentence
      kicker={<>{app.name} · {app.workspace}</>}
      lead
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<PeriodActionsRoom />}
    >
      <RevenueSkeleton />
    </LoadingPage>
  );
}

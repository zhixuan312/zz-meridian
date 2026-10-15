import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { PeriodActionsRoom } from '@/views/period-actions';

/** The parts of Usage, in their shapes, the Featured metric's room first: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function UsageSkeleton() {
  return (
    <>
      <Card className="min-h-[22rem] gap-4 p-(--card-pad)">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-16 w-56 rounded-md" />
        <Skeleton className="h-3 w-80 max-w-full" />
        <Skeleton className="mt-auto h-56 w-full rounded-md" />
      </Card>
      <ChartSkeleton height="h-36" />
      <Row split="1/3">
        <ChartSkeleton height="h-48" />
        <ChartSkeleton height="h-64" />
      </Row>
      <Row split="1/2">
        <ChartSkeleton height="h-44" />
        <ChartSkeleton height="h-44" />
      </Row>
      <ChartSkeleton height="h-16" />
    </>
  );
}

/**
 * Usage on its way: the masthead as the page will have it (its kicker, the room of the line under the title, the
 * freshness and where the period control and Export stand), then the parts' shapes.
 */
export default function UsageLoading() {
  return (
    <LoadingPage
      {...gatedLoading({ name: 'usage', title: 'Usage' })}
      sentence
      kicker={<>{app.name} · {app.workspace}</>}
      lead
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<PeriodActionsRoom />}
    >
      <UsageSkeleton />
    </LoadingPage>
  );
}

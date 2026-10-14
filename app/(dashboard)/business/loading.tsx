import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage, TilesSkeleton } from '@/components/patterns/page-loading';
import { PeriodActionsRoom } from '@/views/period-actions';

/** A card of `n` lines under a title: the ladder's stages, or the lines worth a look. */
function LinesSkeleton({ n }: { n: number }) {
  return (
    <Card className="gap-4 p-(--card-pad)">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: n }, (_, j) => <Skeleton key={j} className="h-3" />)}
    </Card>
  );
}

/** The eight parts of Revenue, in their shapes: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function RevenueSkeleton() {
  return (
    <>
      <TilesSkeleton count={4} />
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
      <LinesSkeleton n={8} />
      <LinesSkeleton n={4} />
      <Row split="1/2">
        <LinesSkeleton n={4} />
        <LinesSkeleton n={4} />
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
      name="revenue"
      title="Revenue"
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

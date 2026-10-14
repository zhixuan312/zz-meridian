import { Card } from '@/components/ui/card';
import { Row } from '@/components/base/shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage, TilesSkeleton } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';
import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PeriodActionsRoom } from '@/views/period-actions';

/** A card of `n` lines under a title: a list part of the page, a year's facts or the lines worth knowing. */
function LinesSkeleton({ n }: { n: number }) {
  return (
    <Card className="gap-4 p-(--card-pad)">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: n }, (_, j) => <Skeleton key={j} className="h-3" />)}
    </Card>
  );
}

/** The nine parts of the Home body, in their shapes: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function HomeSkeleton() {
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
      <TilesSkeleton count={4} />
      <ChartSkeleton height="h-96" />
      <LinesSkeleton n={5} />
      <Row split="1/2">
        <ChartSkeleton height="h-52" />
        <ChartSkeleton height="h-20" />
      </Row>
      <Row split="1/2">
        <LinesSkeleton n={5} />
        <LinesSkeleton n={5} />
      </Row>
      <LinesSkeleton n={4} />
    </>
  );
}

/**
 * Home on its way: the masthead as the page will have it (its kicker, the room of the line under the title, the
 * freshness and where the period control and Export stand), then the nine parts' shapes.
 */
export default function HomeLoading() {
  return (
    <LoadingPage
      {...gatedLoading({ name: 'home', title: 'Home' })}
      sentence
      kicker={<>{app.name} · {app.workspace}</>}
      lead
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<PeriodActionsRoom />}
    >
      <HomeSkeleton />
    </LoadingPage>
  );
}

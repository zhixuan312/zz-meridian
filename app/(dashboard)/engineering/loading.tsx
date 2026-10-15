import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';

/** A card of `n` lines under a title: the open incident, what ships, the work and the changes. */
function LinesSkeleton({ n }: { n: number }) {
  return (
    <Card className="gap-4 p-(--card-pad)">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: n }, (_, j) => <Skeleton key={j} className="h-3" />)}
    </Card>
  );
}

/** The thirteen parts of Now, in their shapes, the Featured metric's room first: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function NowSkeleton() {
  return (
    <>
      <Card className="min-h-[22rem] gap-4 p-(--card-pad)">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-16 w-56 rounded-md" />
        <Skeleton className="h-3 w-80 max-w-full" />
        <Skeleton className="mt-auto h-56 w-full rounded-md" />
      </Card>
      <Row split="2/3">
        <ChartSkeleton height="h-96" />
        <LinesSkeleton n={8} />
      </Row>
      <ChartSkeleton height="h-28" />
      <Row split="2/3">
        <TableSkeleton rows={4} filters={false} />
        <ChartSkeleton height="h-32" />
      </Row>
      <Row split="1/2">
        <LinesSkeleton n={8} />
        <LinesSkeleton n={8} />
      </Row>
      <TableSkeleton rows={7} filters={false} />
      <TilesSkeleton count={4} />
      <Row split="2/3">
        <ChartSkeleton height="h-48" />
        <LinesSkeleton n={5} />
      </Row>
    </>
  );
}

/**
 * Now on its way: the masthead as the page will have it (its kicker, the heading that holds "Now", the room of the
 * line under the title and the freshness; the page has no action), then the parts' shapes.
 */
export default function NowLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'now', title: 'Now' })} sentence kicker={<>{app.name} · {app.workspace}</>} lead meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}>
      <NowSkeleton />
    </LoadingPage>
  );
}

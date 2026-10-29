import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, FeaturedSkeleton, LinesSkeleton, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';

/** The thirteen parts of Now, in their shapes, the Featured metric's room first: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function NowSkeleton() {
  return (
    <>
      <FeaturedSkeleton />
      <Row split="2/3">
        <ChartSkeleton height="h-96" />
        <LinesSkeleton lines={8} />
      </Row>
      <ChartSkeleton height="h-28" />
      <Row split="2/3">
        <TableSkeleton rows={4} filters={false} />
        <ChartSkeleton height="h-32" />
      </Row>
      <Row split="1/2">
        <LinesSkeleton lines={8} />
        <LinesSkeleton lines={8} />
      </Row>
      <TableSkeleton rows={7} filters={false} />
      <TilesSkeleton count={4} />
      <Row split="2/3">
        <ChartSkeleton height="h-48" />
        <LinesSkeleton lines={5} />
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

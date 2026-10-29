import { Row } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, FeaturedSkeleton, LinesSkeleton, LoadingPage, TilesSkeleton } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PeriodActionsRoom } from '@/views/period-actions';

/** The nine parts of the Home body, in their shapes: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function HomeSkeleton() {
  return (
    <>
      <FeaturedSkeleton beside />
      <TilesSkeleton count={4} />
      <ChartSkeleton height="h-96" />
      <LinesSkeleton lines={5} />
      <Row split="1/2">
        <ChartSkeleton height="h-52" />
        <ChartSkeleton height="h-20" />
      </Row>
      <Row split="1/2">
        <LinesSkeleton lines={5} />
        <LinesSkeleton lines={5} />
      </Row>
      <LinesSkeleton />
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

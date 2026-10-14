import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';
import { PeriodActionsRoom } from '@/views/period-actions';

/** The parts of Usage, in their shapes: the page streams them in behind its masthead, and a cold load shows them under the masthead's. */
export function UsageSkeleton() {
  return (
    <>
      <ChartSkeleton height="h-56" />
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

import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, FeaturedSkeleton, LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { SERVICES_LINE } from '@/logic/services-context';

/**
 * The three parts of Services, in their shapes: the Featured metric's room first, then each service with its strip,
 * and the incidents. A card of a block each, not a bar a row: the page's response carries this skeleton more than once
 * (the body's fallback in its HTML, and the fallback and the loading state in its payload), and `/services` is held to
 * its HTML cap in `scripts/verify.config.ts`.
 */
export function ServicesSkeleton() {
  return (
    <>
      <FeaturedSkeleton />
      <Row split="2/3">
        <ChartSkeleton height="h-[44rem]" />
        <ChartSkeleton height="h-[36rem]" />
      </Row>
    </>
  );
}

/**
 * Services on its way: the masthead as the page will have it (its kicker, the heading that holds "Services", its one
 * sentence and the freshness; the page has no action), then the parts' shapes.
 */
export default function ServicesLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'services', title: 'Services', description: SERVICES_LINE })} sentence kicker={<>{app.name} · {app.workspace}</>} meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}>
      <ServicesSkeleton />
    </LoadingPage>
  );
}

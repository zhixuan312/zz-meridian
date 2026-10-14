import { app } from '@/app.config';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { Row } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { ChartSkeleton, LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/access';
import { SERVICES_LINE } from '@/views/services-context';

/**
 * The two parts of Services, in their shapes: each service with its strip, and the incidents. Two cards of a block each,
 * not a bar a row: the page's response carries this skeleton more than once (the body's fallback in its HTML, and the
 * fallback and the loading state in its payload), and `/services` is held to its HTML cap in `scripts/verify.config.ts`.
 */
export function ServicesSkeleton() {
  return (
    <Row split="2/3">
      <ChartSkeleton height="h-[44rem]" />
      <ChartSkeleton height="h-[36rem]" />
    </Row>
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

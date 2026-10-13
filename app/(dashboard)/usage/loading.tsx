import { Row } from '@/components/base/shell';
import { ChartSkeleton, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';

/** The rows of the Usage body, in its shape: the page streams them in behind its masthead, and a cold load shows them under the masthead skeleton. */
export function UsageSkeleton() {
  return (
    <>
      <TilesSkeleton count={4} />
      <Row><ChartSkeleton height="h-56" /></Row>
      <Row split="1/2"><ChartSkeleton /><ChartSkeleton /></Row>
      <Row split="1/2"><ChartSkeleton height="h-56" /><ChartSkeleton height="h-56" /></Row>
      <Row><TableSkeleton rows={6} filters={false} /></Row>
    </>
  );
}

/** Usage on its way: the four figures, the heatmap, two breakdowns, two trends and the endpoint table. */
export default function UsageLoading() {
  return (
    <LoadingPage name="usage" title="Usage">
      <UsageSkeleton />
    </LoadingPage>
  );
}

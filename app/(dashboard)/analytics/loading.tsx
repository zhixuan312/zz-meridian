import { Row } from '@/components/base/shell';
import { ChartSkeleton, LoadingPage, TableSkeleton } from '../_loading';

/** The rows of the Analytics body, in its shape: the page streams them in behind its masthead, and a cold load shows them under the masthead skeleton. */
export function AnalyticsSkeleton() {
  return (
    <>
      <Row><ChartSkeleton height="h-56" /></Row>
      <Row split="1/2"><ChartSkeleton /><ChartSkeleton /></Row>
      <Row split="1/2"><ChartSkeleton height="h-56" /><ChartSkeleton height="h-56" /></Row>
      <Row><TableSkeleton rows={6} filters={false} /></Row>
    </>
  );
}

/** Analytics on its way: the heatmap, two breakdowns, two trends and the endpoint table. */
export default function AnalyticsLoading() {
  return (
    <LoadingPage name="analytics">
      <AnalyticsSkeleton />
    </LoadingPage>
  );
}

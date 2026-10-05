import { Row } from '@/components/base/shell';
import { ChartSkeleton, LoadingPage, TableSkeleton } from '../_loading';

/** Analytics on its way: the heatmap, two breakdowns, two trends and the endpoint table. */
export default function AnalyticsLoading() {
  return (
    <LoadingPage name="analytics">
      <Row><ChartSkeleton height="h-56" /></Row>
      <Row split="1/2"><ChartSkeleton /><ChartSkeleton /></Row>
      <Row split="1/2"><ChartSkeleton height="h-56" /><ChartSkeleton height="h-56" /></Row>
      <Row><TableSkeleton rows={6} filters={false} /></Row>
    </LoadingPage>
  );
}

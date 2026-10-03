import { Suspense } from 'react';
import { Download } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { AnalyticsBody } from '@/views/analytics';
import { DEMO_NOW, DEMO_UPDATED_AT, ENDPOINTS, demoHeatmap, demoSeries } from '@/system/fixtures/sample';
import { REGION_LATENCY, requestsByHour } from '@/system/fixtures/sample-ops';
import { parsePeriod } from '@/lib/period';

export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = parsePeriod((await searchParams).period);
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Analytics"
      description="When traffic comes, where it comes from, and which endpoints are slow."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <>
          <Suspense><PeriodSelect value={period} /></Suspense>
          <Button icon={<Download />} className="max-sm:hidden">Export</Button>
        </>
      }
    >
      <AnalyticsBody series={demoSeries(period).current} heat={demoHeatmap()} hours={requestsByHour()} regions={REGION_LATENCY} endpoints={ENDPOINTS} />
    </PageFrame>
  );
}

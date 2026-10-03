import { Suspense } from 'react';
import { Download } from 'lucide-react';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { OverviewBody } from '@/views/overview';
import { DEMO_NOW, DEMO_UPDATED_AT, demoSeries, demoTotals, ENDPOINTS, STATUS_MIX, ACTIVITY } from '@/system/fixtures/relay';
import { parsePeriod, PERIOD_LABEL } from '@/lib/period';
import { app } from '@/app.config';

export const metadata = { title: 'Overview' };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = parsePeriod((await searchParams).period);
  const { current } = demoSeries(period);
  const totals = demoTotals(period);
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Overview"
      description="Traffic, reliability and spend across every endpoint, for the period you choose."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <>
          <Suspense><PeriodSelect value={period} /></Suspense>
          <Button icon={<Download />} className="max-sm:hidden">Export</Button>
        </>
      }
    >
      <OverviewBody period={PERIOD_LABEL[period].toLowerCase()} series={current} totals={totals} endpoints={ENDPOINTS} mix={STATUS_MIX} activity={ACTIVITY} now={DEMO_NOW.toISOString()} />
    </PageFrame>
  );
}

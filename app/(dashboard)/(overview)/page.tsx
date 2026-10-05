import { Suspense } from 'react';
import { PageFrame, Stack } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewBody } from '@/views/overview';
import { DEMO_NOW, DEMO_UPDATED_AT, demoSeries, demoTotals, ENDPOINTS, STATUS_MIX, ACTIVITY } from '@/data/sample';
import { parsePeriod, PERIOD_LABEL } from '@/lib/period';
import { app } from '@/app.config';
import { OverviewSkeleton } from './loading';

export const metadata = { title: 'Overview' };

type SearchParams = Promise<{ period?: string }>;

/** The masthead renders at once; the period select, the export and the body read the address inside their own boundaries. */
export default function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Overview"
      description="Traffic, reliability and spend across every endpoint, for the period you choose."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<Skeleton className="h-9 w-48 rounded-md" />}>
          <Actions searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={<Stack><OverviewSkeleton /></Stack>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  return (
    <>
      <Suspense><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={demoSeries(period).current} filename={`overview-${period}.csv`} noun="days" className="max-sm:hidden" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  return <OverviewBody period={PERIOD_LABEL[period].toLowerCase()} series={demoSeries(period).current} totals={demoTotals(period)} endpoints={ENDPOINTS} mix={STATUS_MIX} activity={ACTIVITY} now={DEMO_NOW.toISOString()} />;
}

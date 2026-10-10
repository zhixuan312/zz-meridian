import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsBody } from '@/views/analytics';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { analyticsTool } from '@/views/tools';
import { cache } from 'react';
import { parsePeriod } from '@/lib/period';
import { Busy } from '../_loading';
import { AnalyticsSkeleton } from './loading';

export const metadata = { title: 'Analytics' };

type SearchParams = Promise<{ period?: string }>;

/** The page asks its feature before it renders — the rail hiding `/analytics` is presentation, not this gate — then the masthead renders and the period select, the export and the body read the address inside their own boundaries. Next always passes the address; the default keeps the component callable with none, which a check that renders it bare relies on. */
export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('analytics');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Analytics"
      description="When traffic comes, where it comes from, and which endpoints are slow."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<Skeleton className="h-9 w-48 rounded-md" />}>
          <Actions searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={<Busy name="analytics"><AnalyticsSkeleton /></Busy>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

/** The page's one read, through the Analytics tool (`src/views/tools.ts`), shared by the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>) => analyticsTool.read({ period }));

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={data.series} filename={`analytics-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { data } = await readPeriod(parsePeriod((await searchParams).period));
  return <AnalyticsBody {...data} />;
}

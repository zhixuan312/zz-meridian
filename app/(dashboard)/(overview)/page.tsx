import { Suspense } from 'react';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewBody } from '@/views/overview';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { overviewTool } from '@/views/tools';
import { cache } from 'react';
import { parsePeriod } from '@/lib/period';
import { app } from '@/app.config';
import { Busy } from '../_loading';
import { OverviewSkeleton } from './loading';

export const metadata = { title: 'Overview' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/** The page's one read, through the Overview tool (`src/views/tools.ts`), shared by the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>, day?: string) => overviewTool.read({ period, day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined }));

/** The page asks its feature before it renders — the rail hiding `/` is presentation, not this gate — then the masthead renders and the period select, the export and the body read the address inside their own boundaries. Next always passes the address; the default keeps the component callable with none, which a check that renders it bare relies on. */
export default async function OverviewPage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('overview');
  if (denied) return denied;
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
      <Suspense fallback={<Busy name="overview"><OverviewSkeleton /></Busy>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={data.series} filename={`overview-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <OverviewBody {...data} />;
}

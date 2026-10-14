import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { Skeleton } from '@/components/ui/skeleton';
import { UsageBody } from '@/views/usage';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { dayRows } from '@/views/home-context';
import { usageTool } from '@/views/tools';
import { cache } from 'react';
import { parsePeriod } from '@/lib/period';
import { Busy } from '@/components/patterns/page-loading';
import { UsageSkeleton } from './loading';

export const metadata = { title: 'Usage' };

type SearchParams = Promise<{ period?: string }>;

/** The page asks its feature before it renders — the rail hiding `/usage` is presentation, not this gate — then the masthead renders and the title, the period select, the export and the body read the address inside their own boundaries. Next always passes the address; the default keeps the component callable with none, which a check that renders it bare relies on. */
export default async function UsagePage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('usage');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Usage"
      title={<Title searchParams={searchParams} />}
      description={`How usage and revenue moved over the period, when traffic comes and from where, and which endpoints are slow.`}
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<Skeleton className="h-9 w-48 rounded-md" />}>
          <Actions searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={<Busy name="usage"><UsageSkeleton /></Busy>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

/** The page's one read, through the Usage tool (`src/views/tools.ts`), shared by the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>) => usageTool.read({ period }));

/** The page's title, worked out by the read from the period's figures: a sentence, or nothing when it could not be, and the frame then heads the page by its name. */
async function Title({ searchParams }: { searchParams: SearchParams }) {
  return (await readPeriod(parsePeriod((await searchParams).period))).data.head.title;
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={dayRows(data.series)} filename={`usage-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { data } = await readPeriod(parsePeriod((await searchParams).period));
  return <UsageBody {...data} />;
}

import { Suspense } from 'react';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeBody } from '@/views/home';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { dayRows } from '@/views/home-context';
import { homeTool } from '@/views/tools';
import { cache } from 'react';
import { parsePeriod } from '@/lib/period';
import { app, workspaces } from '@/app.config';
import { Busy } from '@/components/patterns/page-loading';
import { HomeSkeleton } from './loading';

export const metadata = { title: 'Home' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/** The page's one read, through the Home tool (`src/views/tools.ts`), shared by the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>, day?: string) => homeTool.read({ period, day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined }));

/** What the Home answers, said under its title while every service is operational. */
const LEAD = 'Traffic, reliability and revenue across every endpoint, for the period you choose.';

/** The page asks its feature before it renders — the rail hiding `/` is presentation, not this gate — then the masthead renders and the title, the period select, the export and the body read the address inside their own boundaries. Next always passes the address; the default keeps the component callable with none, which a check that renders it bare relies on. */
export default async function HomePage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('home');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Home"
      title={<Title searchParams={searchParams} />}
      description={
        <Suspense fallback={<>{LEAD} {workspaces.main.audience}</>}>
          <Lead searchParams={searchParams} />
        </Suspense>
      }
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<Skeleton className="h-9 w-48 rounded-md" />}>
          <Actions searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={<Busy name="home"><HomeSkeleton /></Busy>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

/** The page's title, worked out by the read from the period's figures: a sentence, or nothing when it could not be, and the frame then heads the page by its name. */
async function Title({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  return (await readPeriod(parsePeriod(period), day)).data.head.title;
}

/** The one sentence under the title: which services are not operational when any is, since a record's title has no clause for them; otherwise what the page answers. Then who Main is for. */
async function Lead({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <>{data.unwell ?? LEAD} {workspaces.main.audience}</>;
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={dayRows(data.series)} filename={`home-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <HomeBody {...data} />;
}

import { Suspense } from 'react';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { PeriodSelect } from '@/components/patterns/period-select';
import { HomeBody } from '@/views/home';
import { HomeActionsRoom, PeriodRoom } from '@/views/home-actions';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { dayRows } from '@/views/home-context';
import { homeTool } from '@/views/tools';
import { cache } from 'react';
import { parsePeriod } from '@/lib/period';
import { app, workspaces } from '@/app.config';
import { Busy, LeadRoom } from '@/components/patterns/page-loading';
import { HomeSkeleton } from './loading';

export const metadata = { title: 'Home' };

type SearchParams = Promise<{ period?: string; day?: string }>;

/** The page's one read, through the Home tool (`src/views/tools.ts`), shared by the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>, day?: string) => homeTool.read({ period, day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined }));

/**
 * The page asks its feature before it renders — the rail hiding `/` is presentation, not this gate — then the masthead
 * renders and the title, the line under it, the period select, the export and the body read the address inside their
 * own boundaries. Each fallback takes the room of what it waits for (the line's room, the controls' width), and so
 * does `loading.tsx`, so the body starts at one height from the first frame to the last. The nine parts are one
 * boundary: a part with a boundary of its own would be written after the others. Next always passes the address; the
 * default keeps the component callable with none, which a check that renders it bare relies on.
 */
export default async function HomePage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('home');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Home"
      title={<Title searchParams={searchParams} />}
      description={
        <Suspense fallback={<LeadRoom />}>
          <Lead searchParams={searchParams} />
        </Suspense>
      }
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<HomeActionsRoom />}>
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

/** The line under the title, worked out by the read: the customers, the period's requests and their change, gross margin for a person who may read it, and the services, each one that is not operational named. Then who Main is for. */
async function Lead({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <LeadRoom>{data.line ? `${data.line} ` : ''}{workspaces.main.audience}</LeadRoom>;
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense fallback={<PeriodRoom />}><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={dayRows(data.series)} filename={`home-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <HomeBody {...data} />;
}

import { Suspense, cache } from 'react';
import { app, workspaces } from '@/app.config';
import { gate, gatedMetadata } from '@/data/access';
import { RefusalScreen } from '@/views/refusal';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { Busy, LeadRoom } from '@/components/patterns/page-loading';
import { PeriodSelect } from '@/components/patterns/period-select';
import { parsePeriod } from '@/lib/period';
import { PeriodActionsRoom, PeriodRoom } from '@/views/period-actions';
import { dayRows } from '@/logic/home-context';
import { RevenueBody } from '@/views/revenue';
import { revenueTool } from '@/logic/tools';
import { RevenueSkeleton } from './loading';

export function generateMetadata() {
  return gatedMetadata('revenue', { title: 'Revenue' });
}

type SearchParams = Promise<{ period?: string }>;

/** The page's one read, through the Revenue tool (`src/logic/tools.ts`), shared by the title, the line, the export and the body. */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>) => revenueTool.read({ period }));

/**
 * The page asks its feature before it renders — the rail's hiding is presentation, not this gate — then the masthead
 * renders and the title, the line under it, the period select, the export and the body read the address inside their
 * own boundaries, as Home's do. Each fallback takes the room of what it waits for, and so does `loading.tsx`, so the
 * body starts at one height from the first frame to the last. The eight parts are one boundary. Next always passes the
 * address; the default keeps the component callable with none, which a check that renders it bare relies on.
 */
export default async function RevenuePage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('revenue');
  if (denied) return RefusalScreen(denied);
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Revenue"
      title={<Title searchParams={searchParams} />}
      description={
        <Suspense fallback={<LeadRoom />}>
          <Lead searchParams={searchParams} />
        </Suspense>
      }
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={
        <Suspense fallback={<PeriodActionsRoom />}>
          <Actions searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={<Busy name="revenue"><RevenueSkeleton /></Busy>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}

/** The page's title, worked out by the read for the period: a sentence, or nothing when it could not be, and the frame then heads the page by its name. */
async function Title({ searchParams }: { searchParams: SearchParams }) {
  return (await readPeriod(parsePeriod((await searchParams).period))).data.head.title;
}

/** The line under the title, worked out by the read: the customers by how they stand and the plan that brings the most. Then who Business is for. */
async function Lead({ searchParams }: { searchParams: SearchParams }) {
  const { data } = await readPeriod(parsePeriod((await searchParams).period));
  return <LeadRoom>{data.line ? `${data.line} ` : ''}{workspaces.business.audience}</LeadRoom>;
}

/** The period control and the export of the period's days, each a day's revenue and its revenue by plan. */
async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).period);
  const { data } = await readPeriod(period);
  return (
    <>
      <Suspense fallback={<PeriodRoom />}><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={dayRows(data.days?.series ?? [])} filename={`revenue-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { data } = await readPeriod(parsePeriod((await searchParams).period));
  return <RevenueBody {...data} />;
}

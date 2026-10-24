import { Suspense, cache } from 'react';
import { app, workspaces } from '@/app.config';
import { gate, gatedMetadata } from '@/data/access';
import { renderRefusal } from '@/views/refusal';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PageFrame } from '@/components/base/shell';
import { ExportButton } from '@/components/patterns/export-button';
import { Freshness } from '@/components/patterns/freshness';
import { Busy, LeadRoom } from '@/components/patterns/page-loading';
import { PeriodSelect } from '@/components/patterns/period-select';
import { parsePeriod } from '@/lib/period';
import { PeriodActionsRoom, PeriodRoom } from '@/views/period-actions';
import { dayRows } from '@/logic/home-context';
import { UsageBody } from '@/views/usage';
import { usageTool } from '@/logic/tools';
import { UsageSkeleton } from './loading';

export function generateMetadata() {
  return gatedMetadata('usage', { title: 'Usage' });
}

type SearchParams = Promise<{ period?: string; day?: string }>;

/**
 * The page's one read, through the Usage tool (`src/views/tools.ts`), shared by the title, the line, the export and the body.
 * A day the address names (`?day=`) points the page and its context at it, as Home's does.
 */
const readPeriod = cache((period: ReturnType<typeof parsePeriod>, day?: string) => usageTool.read({ period, day: /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') ? day : undefined }));

/**
 * The page asks its feature before it renders — the rail hiding `/usage` is presentation, not this gate — then the
 * masthead renders and the title, the line under it, the period select, the export and the body read the address
 * inside their own boundaries, as Home's and Revenue's do. Each fallback takes the room of what it waits for, and so
 * does `loading.tsx`, so the body starts at one height from the first frame to the last. The parts are one boundary.
 * Next always passes the address; the default keeps the component callable with none, which a check that renders it
 * bare relies on.
 */
export default async function UsagePage({ searchParams }: { searchParams: SearchParams } = { searchParams: Promise.resolve({}) }) {
  const denied = await gate('usage');
  if (denied) return renderRefusal(denied);
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Usage"
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
      <Suspense fallback={<Busy name="usage"><UsageSkeleton /></Busy>}>
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

/** The line under the title, worked out by the read: requests a day, the share of errors and the median day's p95. Then who Business is for. */
async function Lead({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <LeadRoom>{data.line ? `${data.line} ` : ''}{workspaces.business.audience}</LeadRoom>;
}

/** The period control and the export of the period's days. */
async function Actions({ searchParams }: { searchParams: SearchParams }) {
  const { period: p, day } = await searchParams;
  const period = parsePeriod(p);
  const { data } = await readPeriod(period, day);
  return (
    <>
      <Suspense fallback={<PeriodRoom />}><PeriodSelect value={period} /></Suspense>
      <ExportButton rows={dayRows(data.days?.series ?? [])} filename={`usage-${period}.csv`} noun="days" />
    </>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const { period, day } = await searchParams;
  const { data } = await readPeriod(parsePeriod(period), day);
  return <UsageBody {...data} />;
}

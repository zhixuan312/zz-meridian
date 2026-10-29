import { Suspense, cache } from 'react';
import { app, workspaces } from '@/app.config';
import { gate, gatedMetadata } from '@/data/access';
import { RefusalScreen } from '@/views/refusal';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { Busy, LeadRoom } from '@/components/patterns/page-loading';
import { PackedNowBody } from '@/views/now';
import { packNow } from '@/logic/now-context';
import { nowTool } from '@/logic/tools';
import { NowSkeleton } from './loading';

export function generateMetadata() {
  return gatedMetadata('now', { title: 'Now' });
}

/** The page's one read, through the Now tool (`src/logic/tools.ts`), shared by the title, the line and the body. */
const readNow = cache(() => nowTool.read({}));

/**
 * The page asks its feature before it renders — the rail's hiding is presentation, not this gate — then the masthead
 * renders and the title, the line under it and the body read inside their own boundaries, as Home's and Usage's do.
 * Each fallback takes the room of what it waits for, and so does `loading.tsx`, so the body starts at one height from
 * the first frame to the last. The thirteen parts are one boundary: a part with a boundary of its own would be written
 * after the others.
 */
export default async function NowPage() {
  const denied = await gate('now');
  if (denied) return RefusalScreen(denied);
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Now"
      title={<Title />}
      description={
        <Suspense fallback={<LeadRoom />}>
          <Lead />
        </Suspense>
      }
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
    >
      <Suspense fallback={<Busy name="now"><NowSkeleton /></Busy>}>
        <Body />
      </Suspense>
    </PageFrame>
  );
}

/** The page's title, worked out by the read: what is wrong first, then what is in testing; nothing with no service yet, and the frame then heads the page by its name. */
async function Title() {
  return (await readNow()).data.head.title;
}

/** The line under the title, worked out by the read: the open incident's updates timed from its start, the services and the days inside the band. Then who Engineering is for. */
async function Lead() {
  const { data } = await readNow();
  return <LeadRoom>{data.line ? `${data.line}. ` : ''}{workspaces.engineering.audience}</LeadRoom>;
}

/** The parts, their strips packed one character a day for the trip to the browser. */
async function Body() {
  const { data } = await readNow();
  return <PackedNowBody {...packNow(data)} revisions={data.revisions} />;
}

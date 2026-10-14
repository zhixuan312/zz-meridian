import { Suspense, cache } from 'react';
import { app } from '@/app.config';
import { gate } from '@/data/access';
import { DEMO_NOW, DEMO_UPDATED_AT } from '@/data/sample';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { Busy } from '@/components/patterns/page-loading';
import { packServices } from '@/components/patterns/status-list/summarise';
import { PackedServicesBody } from '@/views/services';
import { SERVICES_LINE } from '@/views/services-context';
import { servicesTool } from '@/views/tools';
import { ServicesSkeleton } from './loading';

export const metadata = { title: 'Services' };

/** The page's one read, through the Services tool (`src/views/tools.ts`), shared by the title and the body. */
const readServicesView = cache(() => servicesTool.read({}));

/**
 * The page asks its feature before it renders — the rail's hiding is presentation, not this gate — then the masthead
 * renders and the title and the body read inside their own boundaries, as Now's do. The body's fallback takes the room
 * of the parts, and `loading.tsx` holds the same masthead, so the body starts at one height from the first frame to the
 * last.
 */
export default async function ServicesPage() {
  const denied = await gate('services');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Services"
      title={<Title />}
      description={SERVICES_LINE}
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
    >
      <Suspense fallback={<Busy name="services"><ServicesSkeleton /></Busy>}>
        <Body />
      </Suspense>
    </PageFrame>
  );
}

/** The page's title, worked out by the read: the uptime of the 90 days and the longest clean run; nothing with no service yet, and the frame then heads the page by its name. */
async function Title() {
  return (await readServicesView()).data.head.title;
}

/** The parts, their strips packed one character a day for the trip to the browser. */
async function Body() {
  const { data } = await readServicesView();
  return <PackedServicesBody {...data} services={packServices(data.services)} />;
}

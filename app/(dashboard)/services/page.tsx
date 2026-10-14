import { app } from '@/app.config';
import { gate } from '@/data/access';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { PackedServicesBody } from '@/views/services';
import { servicesTool } from '@/views/tools';
import { packServices } from '@/components/patterns/status-list/summarise';

export const metadata = { title: 'Services' };

/** Rendered from the Services tool's own read (`src/views/tools.ts`), once the page's feature is held: the rail's hiding is presentation, not this gate. */
export default async function ServicesPage() {
  const denied = await gate('services');
  if (denied) return denied;
  const { data } = await servicesTool.read({});
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Services"
      title={data.head.title}
      description={`Every service, how it is right now, and what happened in the last 90 days.`}
      meta={<Freshness updatedAt={new Date(data.updatedAt)} now={new Date(data.now)} />}
    >
      <PackedServicesBody {...data} services={packServices(data.services)} />
    </PageFrame>
  );
}

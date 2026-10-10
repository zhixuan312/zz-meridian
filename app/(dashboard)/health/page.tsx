import { app } from '@/app.config';
import { gate } from '@/data/access';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { PackedHealthBody, SubscribeButton } from '@/views/health';
import { healthTool } from '@/views/tools';
import { packServices } from '@/components/patterns/status-list/summarise';

export const metadata = { title: 'Health' };

/** Rendered from the Health tool's own read (`src/views/tools.ts`), once the page's feature is held: the rail's hiding is presentation, not this gate. */
export default async function HealthPage() {
  const denied = await gate('health');
  if (denied) return denied;
  const { data } = await healthTool.read({});
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Health"
      description="Every service, how it is right now, and what happened in the last 90 days."
      meta={<Freshness updatedAt={new Date(data.updatedAt)} now={new Date(data.now)} />}
      actions={<SubscribeButton />}
    >
      <PackedHealthBody {...data} services={packServices(data.services)} />
    </PageFrame>
  );
}

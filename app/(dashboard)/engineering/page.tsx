import { app, workspaces } from '@/app.config';
import { gate } from '@/data/access';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { packServices } from '@/components/patterns/status-list/summarise';
import { PackedNowBody } from '@/views/now';
import { nowTool } from '@/views/tools';

export const metadata = { title: 'Now' };

/** Rendered from the Now tool's own read (`src/views/tools.ts`), once the page's feature is held: the rail's hiding is presentation, not this gate. */
export default async function NowPage() {
  const denied = await gate('now');
  if (denied) return denied;
  const { data } = await nowTool.read({});
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Now"
      title={data.head.title}
      description={`Which services are up this moment and what is open. ${workspaces.engineering.audience}`}
      meta={<Freshness updatedAt={new Date(data.updatedAt)} now={new Date(data.now)} />}
    >
      <PackedNowBody {...data} services={packServices(data.services)} />
    </PageFrame>
  );
}

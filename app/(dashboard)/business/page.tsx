import { app, workspaces } from '@/app.config';
import { gate } from '@/data/access';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { RevenueBody } from '@/views/revenue';
import { revenueTool } from '@/views/tools';

export const metadata = { title: 'Revenue' };

/** Rendered from the Revenue tool's own read (`src/views/tools.ts`), once the page's feature is held: the rail's hiding is presentation, not this gate. */
export default async function RevenuePage() {
  const denied = await gate('revenue');
  if (denied) return denied;
  const { data } = await revenueTool.read({});
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      name="Revenue"
      title={data.head.title}
      description={`The revenue of the last 30 days and who has not paid. ${workspaces.business.audience}`}
      meta={<Freshness updatedAt={new Date(data.updatedAt)} now={new Date(data.now)} />}
    >
      <RevenueBody {...data} />
    </PageFrame>
  );
}

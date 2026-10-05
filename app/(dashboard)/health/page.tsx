import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Freshness } from '@/components/patterns/freshness';
import { PackedHealthBody, SubscribeButton } from '@/views/health';
import { packServices } from '@/components/patterns/status-list/summarise';
import { DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, SERVICES, PAST_INCIDENTS } from '@/data/sample';

export const metadata = { title: 'Health' };

export default function HealthPage() {
  const current = INCIDENTS.find((i) => i.state !== 'resolved') ?? null;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Health"
      description="Every service, how it is right now, and what happened in the last 90 days."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<SubscribeButton />}
    >
      <PackedHealthBody services={packServices(SERVICES)} current={current} past={PAST_INCIDENTS} now={DEMO_NOW.toISOString()} />
    </PageFrame>
  );
}

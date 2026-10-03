import { BellRing } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Freshness } from '@/components/patterns/freshness';
import { HealthBody } from '@/views/health';
import { DEMO_NOW, DEMO_UPDATED_AT, INCIDENTS, SERVICES } from '@/system/fixtures/sample';
import { PAST_INCIDENTS } from '@/system/fixtures/sample-ops';

export const metadata = { title: 'Health' };

export default function HealthPage() {
  const current = INCIDENTS.find((i) => i.state !== 'resolved') ?? null;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Health"
      description="Every service, how it is right now, and what happened in the last 90 days."
      meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />}
      actions={<Button icon={<BellRing />}>Subscribe to updates</Button>}
    >
      <HealthBody services={SERVICES} current={current} past={PAST_INCIDENTS} now={DEMO_NOW.toISOString()} />
    </PageFrame>
  );
}

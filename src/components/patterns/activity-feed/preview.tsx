'use client';

import { ACTIVITY, DEMO_NOW } from '@/system/fixtures/sample';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Specimen } from '@/system/specimen';
import { ActivityFeed } from '.';
import { app } from '@/app.config';

export default function ActivityFeedPreview() {
  return (
    <>
      <Specimen label="In a card" note="A person, the system, or an agent acting for a person. An agent's line names the agent and who it acted for.">
        <Card className="w-full">
          <CardHeader title="Activity" description="Changes to this workspace, newest first" divided />
          <CardBody><ActivityFeed events={ACTIVITY} now={DEMO_NOW} /></CardBody>
        </Card>
      </Specimen>
      <Specimen label="Actors" stack>
        <ActivityFeed
          now={DEMO_NOW}
          events={[
            { id: 'p', at: new Date(DEMO_NOW.getTime() - 9 * 60_000).toISOString(), actor: 'Maya Chen', verb: 'rotated', object: 'the production signing key' },
            { id: 's', at: new Date(DEMO_NOW.getTime() - 5.1 * 3600_000).toISOString(), actor: app.name, system: true, verb: 'deployed', object: 'gateway v4.18.2', tone: 'positive' },
            { id: 'w', at: new Date(DEMO_NOW.getTime() - 36 * 60_000).toISOString(), actor: app.name, system: true, verb: 'shifted traffic', object: 'from eu-west-1 to eu-central-1', tone: 'warning' },
            { id: 'a', at: new Date(DEMO_NOW.getTime() - 2.4 * 3600_000).toISOString(), actor: 'Jonas Weber', via: 'Claude', verb: 'raised the rate limit for', object: 'Parallax AI to 2,000 rpm' },
          ]}
        />
      </Specimen>
    </>
  );
}

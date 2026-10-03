'use client';

import { Specimen } from '@/system/specimen';
import { Card } from '@/components/ui/card';
import { DEMO_NOW, INCIDENTS } from '@/system/fixtures/relay';
import type { Incident } from '@/components/patterns/incident-card';
import { IncidentCard } from '.';

const investigating: Incident = { ...INCIDENTS[0], state: 'investigating', severity: 'major', updates: INCIDENTS[0].updates.slice(0, 1) };

export default function IncidentCardPreview() {
  return (
    <>
      <Specimen label="Live" note="A warning edge and the newest update first; the live state pulses." className="grid w-full gap-4 lg:grid-cols-2">
        <IncidentCard incident={INCIDENTS[0]} now={DEMO_NOW} />
        <IncidentCard incident={investigating} now={DEMO_NOW} />
      </Specimen>
      <Specimen label="Resolved" note="No edge; the head says how long it lasted." stack>
        <div className="w-full max-w-md"><IncidentCard incident={INCIDENTS[1]} now={DEMO_NOW} /></div>
      </Specimen>
      <Specimen label="Row" note="The one-line form, for a list of past incidents." stack>
        <Card className="divide-y divide-line overflow-hidden">
          {INCIDENTS.map((i) => <IncidentCard key={i.id} incident={i} now={DEMO_NOW} variant="row" />)}
        </Card>
      </Specimen>
    </>
  );
}

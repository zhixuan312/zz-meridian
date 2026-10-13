'use client';

import { Specimen, State } from '@/system/specimen';
import { Card } from '@/components/ui/card';
import { DEMO_NOW, INCIDENTS } from '@/system/fixtures/sample';
import type { Incident } from '@/components/patterns/incident-card';
import { IncidentCard } from '.';

const investigating: Incident = { ...INCIDENTS[0], state: 'investigating', severity: 'major', updates: INCIDENTS[0].updates.slice(0, 1) };
// The sample's incidents name nobody yet: the team's reading of the open one, with who has it and the ticket its work is tracked in.
const ticket = { title: 'Inference API p95 above target in eu-west-1', href: '/operations-tickets?q=p95+above+target' };
const owned: Incident = { ...INCIDENTS[0], owner: 'Jonas Weber', ticket };
// The same incident with nothing written at its start: its first update came 1.1 hours in.
const late: Incident = { ...INCIDENTS[0], updates: INCIDENTS[0].updates.slice(1) };

export default function IncidentCardPreview() {
  return (
    <>
      <Specimen label="Live" note="A warning edge and the newest update first, each timed from the incident's start; the live state pulses." className="grid w-full gap-4 lg:grid-cols-2">
        <IncidentCard incident={INCIDENTS[0]} now={DEMO_NOW} />
        <IncidentCard incident={investigating} now={DEMO_NOW} />
      </Specimen>
      <Specimen label="Owner and ticket" note="Who has the incident, as text, and the ticket its work is tracked in, a link named by the ticket's title. Either stands alone." stack>
        <div className="w-full max-w-xl"><IncidentCard incident={owned} now={DEMO_NOW} /></div>
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <State label="Owner alone" className="items-stretch"><IncidentCard incident={{ ...investigating, owner: owned.owner }} now={DEMO_NOW} /></State>
          <State label="Ticket alone" className="items-stretch"><IncidentCard incident={{ ...investigating, ticket }} now={DEMO_NOW} /></State>
        </div>
      </Specimen>
      <Specimen label="A late first update" note={'An update reads "at the start" only when it came within a minute of it. The first here came 1.1 hours in, and says so.'} stack>
        <div className="w-full max-w-md"><IncidentCard incident={late} now={DEMO_NOW} /></div>
      </Specimen>
      <Specimen label="Resolved" note="No edge; the head says how long it lasted." stack>
        <div className="w-full max-w-md"><IncidentCard incident={INCIDENTS[1]} now={DEMO_NOW} /></div>
      </Specimen>
      <Specimen label="Row" note="The one-line form, for a list of past incidents. It names no owner and no ticket." stack>
        <Card className="divide-y divide-line overflow-hidden">
          {INCIDENTS.map((i) => <IncidentCard key={i.id} incident={i} now={DEMO_NOW} variant="row" />)}
        </Card>
      </Specimen>
    </>
  );
}

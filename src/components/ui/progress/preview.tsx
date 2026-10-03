'use client';

import { Specimen, State } from '@/system/specimen';
import { Meter, Progress } from '.';

export default function ProgressPreview() {
  return (
    <>
      <Specimen label="Progress" note="A share of a known whole, with the figure beside it." stack>
        <Progress label="Monthly quota" value={8.2} max={10} valueLabel="8.2M of 10M" className="max-w-md" />
        <Progress label="Rollout to eu-west-1" value={64} className="max-w-md" />
        <Progress label="Seats" value={18} max={20} valueLabel="18 of 20" tone="warning" className="max-w-md" />
      </Specimen>
      <Specimen label="Small" note="4px, inside a table cell or a list row.">
        <State label="sm" className="w-48"><Progress value={42} size="sm" className="w-full" /></State>
        <State label="Neutral" className="w-48"><Progress value={70} size="sm" tone="neutral" className="w-full" /></State>
      </Specimen>
      <Specimen label="Meter" note="A level against thresholds: under 70% positive, then warning, from 90% critical.">
        <State label="42% · OK" className="w-40"><Meter value={0.42} label="Plan usage" className="w-full" /></State>
        <State label="78% · Near the limit" className="w-40"><Meter value={0.78} label="Plan usage" className="w-full" /></State>
        <State label="96% · At the limit" className="w-40"><Meter value={0.96} label="Plan usage" className="w-full" /></State>
      </Specimen>
    </>
  );
}

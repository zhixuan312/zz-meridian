'use client';

import { Specimen, State } from '@/system/specimen';
import { Delta } from '.';

export default function DeltaPreview() {
  return (
    <>
      <Specimen label="Up is good" note="Requests, revenue, uptime.">
        <State label="Rise"><Delta value={0.057} /></State>
        <State label="Fall"><Delta value={-0.124} /></State>
      </Specimen>
      <Specimen label="Down is good" note="intent=down: latency, errors, cost per request.">
        <State label="Fall"><Delta value={-0.081} intent="down" /></State>
        <State label="Rise"><Delta value={0.13} intent="down" /></State>
      </Specimen>
      <Specimen label="No judgement" note="intent=neutral: spend, where more is neither good nor bad.">
        <State label="Rise"><Delta value={0.062} intent="neutral" /></State>
        <State label="Flat"><Delta value={0} /></State>
        <State label="Nothing to compare"><Delta value={null} /></State>
      </Specimen>
      <Specimen label="In points" note='format="points": a change in a figure that is itself a share, a refusal share from 33.0% to 46.4%, reads 13.4 points, never 40.6% of itself. No change reads in the same format.'>
        <State label="Rise"><Delta value={0.134} format="points" intent="down" /></State>
        <State label="Flat"><Delta value={0} format="points" intent="down" /></State>
      </Specimen>
      <Specimen label="In context">
        <span className="flex items-center gap-2 text-xs"><Delta value={0.057} /><span className="text-ink-3">vs previous period</span></span>
      </Specimen>
    </>
  );
}

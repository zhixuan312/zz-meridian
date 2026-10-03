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
      <Specimen label="In context">
        <span className="flex items-center gap-2 text-xs"><Delta value={0.057} /><span className="text-ink-3">vs previous period</span></span>
      </Specimen>
    </>
  );
}

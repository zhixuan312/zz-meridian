'use client';

import { Specimen, State } from '@/system/specimen';
import { Badge } from '.';

export default function BadgePreview() {
  return (
    <>
      <Specimen label="Tones" note="The word always states the state; the colour repeats it.">
        <Badge>Draft</Badge>
        <Badge tone="accent">Beta</Badge>
        <Badge tone="positive">Operational</Badge>
        <Badge tone="warning">Degraded</Badge>
        <Badge tone="critical">Outage</Badge>
      </Specimen>
      <Specimen label="With a dot" note="For a live state in a list or a header.">
        <Badge dot>Paused</Badge>
        <Badge tone="accent" dot>Live</Badge>
        <Badge tone="positive" dot>Healthy</Badge>
        <Badge tone="warning" dot>Rate limited</Badge>
        <Badge tone="critical" dot>Failing</Badge>
      </Specimen>
      <Specimen label="In context">
        <State label="Status column"><span className="flex items-center gap-3 text-sm"><span className="t-num">503</span><Badge tone="critical">Server error</Badge></span></State>
        <State label="Beside a title"><span className="flex items-center gap-2"><span className="t-card">Inference API</span><Badge tone="warning" dot>Degraded</Badge></span></State>
        <State label="Plan"><Badge>Enterprise</Badge></State>
      </Specimen>
    </>
  );
}

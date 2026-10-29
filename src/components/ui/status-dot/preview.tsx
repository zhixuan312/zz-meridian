'use client';

import { Specimen, State } from '@/system/specimen';
import { StatusDot } from '.';

const T = [['neutral', 'Paused'], ['accent', 'Syncing'], ['positive', 'Operational'], ['warning', 'Degraded'], ['critical', 'Outage']] as const;

export default function StatusDotPreview() {
  return (
    <>
      <Specimen label="Tones" note="Always beside its word.">
        {T.map(([t, w]) => (
          <span key={t} className="flex items-center gap-2 text-sm"><StatusDot tone={t} />{w}</span>
        ))}
      </Specimen>
      <Specimen label="Live" note="A slow pulse for a state that is current and updating. The one loop allowed outside a skeleton; still under reduced motion.">
        <State label="Live"><span className="flex items-center gap-2 text-sm"><StatusDot tone="positive" live />Updated 4 min ago</span></State>
        <State label="Static"><span className="flex items-center gap-2 text-sm"><StatusDot tone="warning" />Stale · 22 min ago</span></State>
      </Specimen>
      <Specimen label="Labelled" note="No word beside it, in a list row or a finding: `label` names it, to a screen reader and in its title.">
        <span className="flex items-center gap-3 text-sm"><StatusDot tone="critical" label="Outage" />api-gateway</span>
      </Specimen>
    </>
  );
}

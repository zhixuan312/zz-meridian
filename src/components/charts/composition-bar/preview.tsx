'use client';

import { Specimen, Plane } from '@/system/specimen';
import { REGIONS, STATUS_MIX } from '@/system/fixtures/sample';
import { formatCompact } from '@/lib/format';
import { CompositionBar } from '.';

export default function CompositionBarPreview() {
  return (
    <>
      <Specimen label="Status classes" note="When the parts carry a judgement, they take status colours, and the legend says the word.">
        <Plane on="surface" className="max-w-xl">
          <CompositionBar
            label="Responses by status class"
            format={formatCompact}
            parts={[
              { ...STATUS_MIX[0], color: 'neutral' },
              { ...STATUS_MIX[1], color: 1 },
              { ...STATUS_MIX[2], color: 'warning' },
              { ...STATUS_MIX[3], color: 'critical' },
            ]}
          />
        </Plane>
      </Specimen>
      <Specimen label="Categories" note="Parts with no judgement take the categorical slots in order.">
        <Plane on="surface" className="max-w-xl">
          <CompositionBar label="Requests by region" format={formatCompact} parts={REGIONS.map((r) => ({ label: r.label, value: r.value }))} />
        </Plane>
      </Specimen>
      <Specimen label="A sliver" note="A part under 1% keeps a 3px minimum so it stays visible; its legend carries one decimal.">
        <Plane on="surface" className="max-w-xl">
          <CompositionBar label="Plan mix" parts={[{ label: 'Enterprise', value: 912 }, { label: 'Scale', value: 80 }, { label: 'Starter', value: 4 }]} />
        </Plane>
      </Specimen>
    </>
  );
}

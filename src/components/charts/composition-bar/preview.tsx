'use client';

import { Specimen, Plane } from '@/system/specimen';
import { REGIONS, STATUS_MIX } from '@/system/fixtures/company';
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
      <Specimen label="Stacked" note="The parts a stacked chart beside it draws: the one-hue stack by place, so each part keeps its colour across the page. In a narrow card the legend stays two across.">
        <Plane on="surface" className="max-w-xs">
          <CompositionBar label="Revenue by plan" stacked parts={[{ label: 'Enterprise · 24', value: 2_046_000 }, { label: 'Scale · 82', value: 891_000 }, { label: 'Starter · 214', value: 360_000 }]} />
        </Plane>
      </Specimen>
      <Specimen label="A sliver" note="A part under 1% keeps a 3px minimum so it stays visible; its legend carries one decimal.">
        <Plane on="surface" className="max-w-xl">
          <CompositionBar label="Plan mix" parts={[{ label: 'Enterprise', value: 912 }, { label: 'Scale', value: 80 }, { label: 'Starter', value: 4 }]} />
        </Plane>
      </Specimen>
      <Specimen label="More parts than colours" note="Twelve models: the palette has six slots, so the first five keep theirs and the rest are Other, their sum, in the neutral. Every share is still of the whole.">
        <Plane on="surface" className="max-w-xl">
          <CompositionBar label="Requests by model" format={formatCompact} parts={Array.from({ length: 12 }, (_, i) => ({ label: `Model ${String.fromCharCode(65 + i)}`, value: Math.round(4_800_000 / (i + 1)) }))} />
        </Plane>
      </Specimen>
    </>
  );
}

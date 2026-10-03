'use client';

import { Specimen, Plane } from '@/system/specimen';
import { demoHeatmap } from '@/system/fixtures/relay';
import { formatCompact } from '@/lib/format';
import { Heatmap } from '.';

const values = demoHeatmap();

export default function HeatmapPreview() {
  return (
    <>
      <Specimen label="By hour" note="Twenty-four columns, Monday first, UTC. Six steps of the accent, from an empty track to full.">
        <Plane on="surface">
          <Heatmap label="Requests by weekday and hour" values={values} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="Grouped" note="Under 560px of width the hours group in threes: eight columns, each still large enough to point at.">
        <Plane on="surface" className="max-w-sm">
          <Heatmap label="Requests by weekday and three-hour block" values={values} format={formatCompact} />
        </Plane>
      </Specimen>
    </>
  );
}

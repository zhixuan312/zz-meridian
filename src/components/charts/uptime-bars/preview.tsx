'use client';

import { Specimen, Plane } from '@/system/specimen';
import { DEMO_NOW, SERVICES } from '@/system/fixtures/sample';
import { UptimeBars } from '.';

export default function UptimeBarsPreview() {
  return (
    <>
      <Specimen label="Ninety days" note="One SVG per strip. Healthy days are the baseline and recede; degraded and outage days are marks that stand out." stack>
        {SERVICES.slice(0, 4).map((s) => (
          <Plane key={s.name} on="surface">
            <p className="mb-3 flex items-baseline gap-2 text-sm"><span className="font-medium">{s.name}</span><span className="t-caption">{s.description}</span></p>
            <UptimeBars label={`${s.name} over 90 days`} days={s.days} uptime={s.uptime} end={DEMO_NOW} />
          </Plane>
        ))}
      </Specimen>
      <Specimen label="Narrow" note="Under 420px every day still shows: the drawing scales down with its container, so the figure and the label describe exactly the days drawn.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Inference API over 90 days" days={SERVICES[1].days} uptime={SERVICES[1].uptime} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="No data" note="A day with no data is drawn in the line colour, never as an operational day, and the summary lists it as No data.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Batch worker over 90 days" days={SERVICES[0].days.map((d, i) => (i >= 20 && i < 26 ? 'none' : d))} uptime={SERVICES[0].uptime} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="No incidents" note="Every day operational: one baseline, no marks, and the summary says No incidents.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Search over 90 days" days={Array.from({ length: 90 }, () => 'operational' as const)} uptime={1} end={DEMO_NOW} />
        </Plane>
      </Specimen>
    </>
  );
}

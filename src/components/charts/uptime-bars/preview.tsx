'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { DEMO_NOW, SERVICES, uptimeOf } from '@/system/fixtures/sample';
import { formatDate } from '@/lib/format-date';
import { UptimeBars } from '.';

const YESTERDAY = new Date(DEMO_NOW.getTime() - 86_400_000);
/** The Batch worker's days with six of them unrecorded; its uptime is over the days that were. */
const GAPPED = SERVICES[0].days.map((d, i) => (i >= 20 && i < 26 ? ('none' as const) : d));

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
      <Specimen label="Hover or focus" note="The day pointed at, or moved to with the arrow keys: a rect marks it and the tooltip names its state and date.">
        <State label="An outage day" still className="w-full max-w-sm pt-10">
          <Plane on="surface" className="w-full">
            <UptimeBars label={`${SERVICES[3].name} over 90 days`} days={SERVICES[3].days} uptime={SERVICES[3].uptime} end={DEMO_NOW} data-preview-index={SERVICES[3].days.indexOf('outage')} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Short history" note="Fewer days than the window: the days widen to fill it, and the caption's count says how many there are.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Batch worker over its 12 days" days={SERVICES[0].days.slice(-12)} uptime={uptimeOf(SERVICES[0].days.slice(-12))} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="No days" note="Nothing recorded yet: one line, and no plot, caption or period between two invented dates.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="A new service over 90 days" days={[]} uptime={1} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="Narrow" note="Under 420px every day still shows: the drawing scales down with its container, so the figure and the label describe exactly the days drawn.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Inference API over 90 days" days={SERVICES[1].days} uptime={SERVICES[1].uptime} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="No data" note="A day with no data is drawn in the line colour, never as an operational day, and the summary lists it as No data.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Batch worker over 90 days" days={GAPPED} uptime={uptimeOf(SERVICES[0].days.filter((_, i) => i < 20 || i >= 26))} end={DEMO_NOW} />
        </Plane>
      </Specimen>
      <Specimen label="Complete days" note="A strip that ends on the latest complete day takes it as end and names it in endLabel; the caption never calls it Today.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Days inside the band, the last 90 complete days" days={SERVICES[1].days} uptime={SERVICES[1].uptime} end={YESTERDAY} endLabel={formatDate(YESTERDAY)} measure="inside the band" />
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

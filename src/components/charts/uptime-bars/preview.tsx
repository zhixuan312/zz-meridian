'use client';

import { Specimen, Plane } from '@/system/specimen';
import { DEMO_NOW, SERVICES } from '@/system/fixtures/sample';
import { UptimeBars } from '.';

export default function UptimeBarsPreview() {
  return (
    <>
      <Specimen label="Ninety days" note="One bar per day. Healthy days recede; degraded and outage days stand out." stack>
        {SERVICES.slice(0, 4).map((s) => (
          <Plane key={s.name} on="surface">
            <p className="mb-3 flex items-baseline gap-2 text-sm"><span className="font-medium">{s.name}</span><span className="t-caption">{s.description}</span></p>
            <UptimeBars label={`${s.name} over 90 days`} days={s.days} uptime={s.uptime} end={DEMO_NOW} />
          </Plane>
        ))}
      </Specimen>
      <Specimen label="Narrow" note="Under 420px the last 30 days show, so each bar stays at least 8px wide.">
        <Plane on="surface" className="max-w-sm">
          <UptimeBars label="Inference API, last 30 days" days={SERVICES[1].days} uptime={SERVICES[1].uptime} end={DEMO_NOW} />
        </Plane>
      </Specimen>
    </>
  );
}

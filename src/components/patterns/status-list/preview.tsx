'use client';

import { Specimen } from '@/system/specimen';
import { Card } from '@/components/ui/card';
import { DEMO_NOW, SERVICES } from '@/system/fixtures/sample';
import type { Service } from '@/components/patterns/status-list';
import { StatusList } from '.';

// Every day operational, so every figure says so: a strip with nothing on it cannot read 99.81%.
const healthy: Service[] = SERVICES.map((s) => ({ ...s, status: 'operational', uptime: 1, days: s.days.map(() => 'operational') }));
const outage: Service[] = SERVICES.map((s, i) => (i === 3 ? { ...s, status: 'outage', days: [...s.days.slice(0, -1), 'outage'] } : s));

export default function StatusListPreview() {
  return (
    <>
      <Specimen label="Wide" note="The bars sit beside each service from 42rem of card width." stack>
        <Card className="overflow-hidden"><StatusList services={SERVICES} end={DEMO_NOW} /></Card>
      </Specimen>
      <Specimen label="Narrow" note="Under 42rem the bars drop under the name; under 420px their gaps tighten to 1px." stack>
        <div className="w-full max-w-sm"><Card className="overflow-hidden"><StatusList services={SERVICES.slice(0, 3)} end={DEMO_NOW} descriptions={false} /></Card></div>
      </Specimen>
      <Specimen label="All operational" note="The summary is calm: ink, a still dot." stack>
        <Card className="overflow-hidden"><StatusList services={healthy.slice(0, 2)} end={DEMO_NOW} /></Card>
      </Specimen>
      <Specimen label="Outage" note="The worst state wins the summary, in words and colour; its dot pulses." stack>
        <Card className="overflow-hidden"><StatusList services={outage.slice(2, 5)} end={DEMO_NOW} /></Card>
      </Specimen>
    </>
  );
}

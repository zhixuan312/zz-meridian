'use client';

import { Specimen } from '@/system/specimen';
import { Card } from '@/components/ui/card';
import { DEMO_NOW, SERVICES, uptimeOf } from '@/system/fixtures/sample';
import type { Service } from '@/components/patterns/status-list';
import { StatusList } from '.';

// Every day operational, so every figure says so: a strip with nothing on it cannot read 99.81%.
const healthy: Service[] = SERVICES.map((s) => ({ ...s, status: 'operational', uptime: 1, days: s.days.map(() => 'operational') }));
// Files down today: its uptime is worked out again from the days it now has, by the sample's rule.
const down = (s: Service): Service => ((days) => ({ ...s, status: 'outage', uptime: uptimeOf(days), days }))([...s.days.slice(0, -1), 'outage' as const]);
const outage: Service[] = SERVICES.map((s, i) => (i === 3 ? down(s) : s));
// Every reading a run has. The sample's own days give three: Dashboard's 69 days are its longest, Embeddings and Webhooks
// have run longer before, and Inference API is degraded today. The other two are derived: a gateway with no mark in the
// days kept, and Files down today.
const runs: Service[] = outage.map((s, i) => (i === 0 ? healthy[0] : s));

export default function StatusListPreview() {
  return (
    <>
      <Specimen label="Wide" note="The bars sit beside each service from 42rem of card width." stack>
        <Card className="overflow-hidden"><StatusList services={SERVICES} end={DEMO_NOW} /></Card>
      </Specimen>
      <Specimen label="Narrow" note="Under 42rem the bars drop under the name; they scale down with the card, every day still drawn." stack>
        <div className="w-full max-w-sm"><Card className="overflow-hidden"><StatusList services={SERVICES.slice(0, 3)} end={DEMO_NOW} descriptions={false} /></Card></div>
      </Specimen>
      <Specimen label="Runs" note="Under each strip, the operational days that end today: its longest in the days kept when no run among them is longer, at least the days kept when no day has a mark, and the state alone when today has one." stack>
        <Card className="overflow-hidden"><StatusList run services={runs} end={DEMO_NOW} /></Card>
      </Specimen>
      <Specimen label="Runs, narrow" note="The run keeps its line under the bars and wraps before it is cut." stack>
        <div className="w-full max-w-sm"><Card className="overflow-hidden"><StatusList run services={[runs[5], runs[0], runs[1], runs[3]]} end={DEMO_NOW} descriptions={false} /></Card></div>
      </Specimen>
      <Specimen label="All operational" note="The summary is calm: ink, a still dot." stack>
        <Card className="overflow-hidden"><StatusList services={healthy.slice(0, 2)} end={DEMO_NOW} /></Card>
      </Specimen>
      <Specimen label="Down" note="The worst state wins the summary, in words and colour; its dot pulses." stack>
        <Card className="overflow-hidden"><StatusList services={outage.slice(2, 5)} end={DEMO_NOW} /></Card>
      </Specimen>
    </>
  );
}

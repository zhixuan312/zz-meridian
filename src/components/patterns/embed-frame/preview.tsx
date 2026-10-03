'use client';

import { Zap, Gauge } from 'lucide-react';
import { demoSeries, DEMO_NOW, DEMO_UPDATED_AT } from '@/system/fixtures/sample';
import { formatCompact, formatDuration } from '@/lib/format';
import { SurfaceOverride } from '@/components/base/surface';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { Specimen, State } from '@/system/specimen';
import { EmbedFrame } from '.';
import { app } from '@/app.config';

const s = demoSeries('7d').current;

function View({ mode }: { mode: 'inline' | 'fullscreen' }) {
  return (
    <SurfaceOverride surface={{ kind: 'embed', mode, connected: true }}>
      <EmbedFrame title="Overview · Last 7 days" meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />} consolePath="/?period=7d">
        <div className="grid gap-3 @min-[30rem]:grid-cols-2">
          <MetricTile label="Requests" icon={<Zap />} value={612_480} delta={0.041} daily={s.map((d) => d.requests)} format={formatCompact} emphasis />
          <MetricTile label="Latency p95" icon={<Gauge />} value={301} delta={0.02} intent="down" daily={s.map((d) => d.p95)} format={formatDuration} />
        </div>
      </EmbedFrame>
    </SurfaceOverride>
  );
}

/** A host's message column, so the view is seen as a guest in someone else's interface. */
const Host = ({ width, children }: { width: number; children: React.ReactNode }) => (
  <div className="@container rounded-xl border border-dashed border-line-strong p-3" style={{ width, maxWidth: '100%' }}>
    <p className="t-eyebrow mb-3">Host · assistant message</p>
    {children}
  </div>
);

export default function EmbedFramePreview() {
  return (
    <>
      <Specimen label="Inline" note={`The default in a chat: the view's title, freshness, Expand and Open in ${app.name}, then one job. No frame, rail or masthead; the host's ground shows through.`}>
        <State label="420px"><Host width={420}><View mode="inline" /></Host></State>
        <State label="720px"><Host width={720}><View mode="inline" /></Host></State>
      </Specimen>
      <Specimen label="Fullscreen" note="After Expand, when the host allows it: a page title and the console's rows, without the shell.">
        <Host width={720}><View mode="fullscreen" /></Host>
      </Specimen>
    </>
  );
}

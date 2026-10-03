'use client';

import { Gauge, Zap } from 'lucide-react';
import { demoSeries, DEMO_NOW, DEMO_UPDATED_AT } from '@/system/fixtures/relay';
import { formatCompact, formatDuration } from '@/lib/format';
import { SurfaceOverride } from '@/components/base/surface';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Freshness } from '@/components/patterns/freshness';
import { MetricTile } from '@/components/patterns/metric-tile';
import { Specimen } from '@/system/specimen';

const s = demoSeries('7d').current;

const METHODS = [
  ['ui/initialize', 'Start: the host answers with its theme, display mode, size, safe area and style variables'],
  ['ui/notifications/size-changed', 'Report the body height whenever it changes: an inline view never scrolls'],
  ['ui/request-display-mode', 'Expand: ask for fullscreen; the host may refuse'],
  ['ui/message', 'Ask: post a question into the conversation, as the person'],
  ['ui/update-model-context', 'Share: tell the model what is on screen'],
  ['ui/open-link', 'Open in Relay: leave for the console'],
  ['tools/call', 'Act: run a tool; a write arrives as a Proposal first'],
];
const BRIDGE = [
  ['ground, frame', 'transparent'],
  ['surface, surface-raised', '--color-background-primary'],
  ['surface-sunk', '--color-background-secondary'],
  ['ink · ink-2 · ink-3', '--color-text-primary · secondary · tertiary'],
  ['line · line-strong', '--color-border-primary · secondary'],
  ['radius-md · radius-lg', '--border-radius-md · lg'],
  ['font-sans', '--font-sans'],
];

export default function SurfacePreview() {
  return (
    <>
      <Specimen label="Console and embed" note="The same tiles. On the console they sit on the lit ground; in a host they are guests: no light, the host's neutrals.">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="t-eyebrow mb-3">Console</p>
            <MetricTile label="Requests" icon={<Zap />} value={612_480} delta={0.041} daily={s.map((d) => d.requests)} format={formatCompact} emphasis />
          </div>
          <div className="rounded-xl border border-dashed border-line-strong p-4">
            <p className="t-eyebrow mb-3">Embed · inline</p>
            <SurfaceOverride surface={{ kind: 'embed', mode: 'inline', connected: true }}>
              <EmbedFrame title="Latency · Last 7 days" meta={<Freshness updatedAt={DEMO_UPDATED_AT} now={DEMO_NOW} />} consolePath="/?period=7d">
                <MetricTile label="Latency p95" icon={<Gauge />} value={301} delta={0.02} intent="down" daily={s.map((d) => d.p95)} format={formatDuration} />
              </EmbedFrame>
            </SurfaceOverride>
          </div>
        </div>
      </Specimen>
      <Specimen label="The host bridge" note="What a view may ask of its host, through useSurface(). Components never touch the bridge.">
        <dl className="w-full overflow-hidden rounded-lg border border-line">
          {METHODS.map(([m, d]) => (
            <div key={m} className="grid gap-1 border-b border-line px-4 py-2.5 last:border-0 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <dt className="t-mono text-ink">{m}</dt>
              <dd className="t-small text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Specimen>
      <Specimen label="The token bridge" note="Meridian's neutral roles take the host's style variables, with Meridian's own value as the fallback. Accent, status and chart colours never bridge.">
        <dl className="w-full overflow-hidden rounded-lg border border-line">
          {BRIDGE.map(([m, h]) => (
            <div key={m} className="grid gap-1 border-b border-line px-4 py-2.5 last:border-0 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <dt className="t-mono text-ink">{m}</dt>
              <dd className="t-mono text-ink-2">{h}</dd>
            </div>
          ))}
        </dl>
      </Specimen>
    </>
  );
}

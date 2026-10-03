'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Specimen, State } from '@/system/specimen';

const CURVES = [
  { name: 'ease-out', v: [0.16, 1, 0.3, 1], use: 'Everything that arrives' },
  { name: 'ease-in-out', v: [0.65, 0, 0.35, 1], use: 'Moving while visible' },
  { name: 'ease-spring', v: [0.34, 1.36, 0.5, 1], use: 'The nav marker, a switch thumb' },
];
const DURS = [
  { name: 'dur-press', ms: 110, use: 'A control giving under the pointer' },
  { name: 'dur-hover', ms: 160, use: 'Colour and outline changes' },
  { name: 'dur-enter', ms: 320, use: 'Overlays, rows, sliding indicators' },
  { name: 'dur-grow', ms: 820, use: 'Bars growing, lines drawing' },
];

function Curve({ v }: { v: number[] }) {
  const [x1, y1, x2, y2] = v;
  const P = (x: number, y: number) => `${8 + x * 104},${112 - y * 88}`;
  return (
    <svg viewBox="0 0 120 128" className="h-32 w-30 overflow-visible">
      <path d={`M${P(0, 0)} L${P(1, 0)} M${P(0, 0)} L${P(0, 1)}`} stroke="var(--chart-axis)" fill="none" />
      <path d={`M${P(0, 0)} L${P(x1, y1)} M${P(1, 1)} L${P(x2, y2)}`} stroke="var(--ink-3)" strokeDasharray="2 3" fill="none" />
      <path d={`M${P(0, 0)} C${P(x1, y1)} ${P(x2, y2)} ${P(1, 1)}`} stroke="var(--accent)" strokeWidth={2} fill="none" />
    </svg>
  );
}

export default function MotionPreview() {
  const [run, setRun] = useState(0);
  return (
    <>
      <Specimen label="Arrive" note="Data landing: rows rise in reading order, 45ms apart; bars grow from their baseline. Press replay to watch it.">
        <div className="flex w-full flex-col gap-3">
          <Button size="sm" icon={<RotateCw />} onClick={() => setRun((r) => r + 1)} className="self-start">Replay</Button>
          <div key={run} className="arrive grid w-full grid-cols-4 gap-3">
            {[0.82, 0.56, 0.94, 0.38].map((h, i) => (
              <div key={i} className="flex h-28 items-end rounded-lg border border-line bg-surface p-3">
                <div className="grow-y w-full rounded-xs bg-accent" style={{ height: `${h * 100}%`, ['--i' as string]: i }} />
              </div>
            ))}
          </div>
        </div>
      </Specimen>
      <Specimen label="Answer" note="A control acknowledges you: it gives half a pixel under the pointer, an underline draws in.">
        <State label="Press (hold)"><Button variant="primary">Rotate key</Button></State>
        <State label="Underline"><a href="#motion" className="link text-sm">View all endpoints</a></State>
      </Specimen>
      <Specimen label="Float" note="Menus, dialogs and toasts rise 4–10px and fade in over dur-enter; they leave faster than they came.">
        <div key={run} className="float-in rounded-lg bg-surface-raised px-4 py-3 text-sm shadow-overlay">Key rotated</div>
      </Specimen>
      <Specimen label="Durations">
        <div className="flex w-full flex-col gap-3">
          {DURS.map((d) => (
            <div key={d.name} className="grid grid-cols-[7rem_1fr] items-center gap-4 sm:grid-cols-[7rem_1fr_14rem]">
              <code className="t-mono text-ink-2">{d.name}</code>
              <div className="h-1.5 rounded-full bg-fill-track"><div className="h-full rounded-full bg-accent" style={{ width: `${(d.ms / 820) * 100}%` }} /></div>
              <span className="t-caption max-sm:col-span-2">{d.ms}ms · {d.use}</span>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen label="Curves">
        {CURVES.map((c) => (
          <State key={c.name} label={`${c.name} · ${c.use}`}><Curve v={c.v} /></State>
        ))}
      </Specimen>
      <Specimen label="Reduced motion" note="Every duration and delay collapses; arrivals show their final state outright. Two loops exist (a skeleton's shimmer, a live dot's pulse) and both stop.">
        <p className="t-small max-w-[60ch] text-ink-2">Nothing in Meridian moves to decorate. If motion does not explain a change, it is cut.</p>
      </Specimen>
    </>
  );
}

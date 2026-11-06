'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { IntervalTimeline, type TimelineRow } from '.';

/** An hour of scheduled and triggered work: a build, the checks it started and a release behind them. */
const HOUR: TimelineRow[] = [
  {
    key: 'build',
    label: 'Build',
    runs: [
      { from: '2026-10-01T09:00:00Z', to: '2026-10-01T09:06:00Z', tone: 'neutral', label: 'Build 4821' },
      { from: '2026-10-01T09:20:00Z', to: '2026-10-01T09:24:00Z', tone: 'neutral', label: 'Build 4822' },
      { from: '2026-10-01T09:40:00Z', to: null, tone: 'neutral', label: 'Build 4823' },
    ],
  },
  {
    key: 'checks',
    label: 'Integration',
    runs: [
      { from: '2026-10-01T09:06:00Z', to: '2026-10-01T09:15:00Z', tone: 'neutral', label: 'Integration 4821' },
      { from: '2026-10-01T09:24:00Z', to: '2026-10-01T09:26:00Z', tone: 'critical', label: 'Integration 4822' },
      { from: '2026-10-01T09:41:00Z', to: null, tone: 'neutral', label: 'Integration 4823' },
    ],
  },
  {
    key: 'canary',
    label: 'Canary',
    runs: [
      { from: '2026-10-01T09:15:00Z', to: '2026-10-01T09:19:00Z', tone: 'warning', label: 'Canary 10%' },
    ],
  },
];
const hour = (iso: string) => iso.slice(11, 16);

export default function IntervalTimelinePreview() {
  return (
    <>
      <Specimen label="An hour of runs" note="Each row is a series of runs from start to end on one time axis: a build, the checks it started, and the release behind them. A failed run is told apart by word and tone — the bar's own name says 'Failed', and the readout repeats it — never by colour alone. A run still in progress reaches the now line.">
        <Plane on="surface">
          <IntervalTimeline label="What ran, 09:00 to 10:00" rows={HOUR} start="2026-10-01T09:00:00Z" end="2026-10-01T10:00:00Z" now="2026-10-01T09:47:00Z" tick={hour} />
        </Plane>
      </Specimen>
      <Specimen label="A short run is a marker" note="A run's length stays proportional to the time it took. Two seconds beside an hour is not a bar a pixel wide but a marker at its start, so a quick job is still found and still reads as quick.">
        <Plane on="surface">
          <IntervalTimeline
            label="Two very different runs"
            start="2026-10-01T09:00:00Z"
            end="2026-10-01T10:00:00Z"
            tick={hour}
            now="2026-10-01T09:30:00Z"
            rows={[{ key: 'a', label: 'Jobs', runs: [
              { from: '2026-10-01T09:00:00Z', to: '2026-10-01T10:00:00Z', tone: 'neutral', label: 'Backfill' },
              { from: '2026-10-01T09:29:58Z', to: '2026-10-01T09:30:00Z', tone: 'neutral', label: 'Flush' },
            ] }]}
          />
        </Plane>
      </Specimen>
      <Specimen label="A window that has closed" note="No now line: omit `now` for a window that is over, and the axis names its own end.">
        <Plane on="surface">
          <IntervalTimeline label="Yesterday's runs" rows={[{ key: 'x', label: 'Scheduled jobs', runs: [
            { from: '2026-09-30T02:00:00Z', to: '2026-09-30T02:35:00Z', tone: 'neutral', label: 'Nightly import' },
            { from: '2026-09-30T03:00:00Z', to: '2026-09-30T03:04:00Z', tone: 'critical', label: 'Nightly reconcile' },
          ] }]} start="2026-09-30T00:00:00Z" end="2026-09-30T06:00:00Z" tick={(iso) => iso.slice(11, 16)} />
        </Plane>
      </Specimen>
      <Specimen label="Nothing ran" note="An empty row is a stretch of time with nothing on it, drawn as the axis alone rather than as a run at zero.">
        <State label="No runs in the window" className="w-full">
          <Plane on="surface">
            <IntervalTimeline label="An hour with nothing scheduled" rows={[{ key: 'e', label: 'Nothing scheduled', runs: [] }]} start="2026-10-01T09:00:00Z" end="2026-10-01T10:00:00Z" tick={hour} />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

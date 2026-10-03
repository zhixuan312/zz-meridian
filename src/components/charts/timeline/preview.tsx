'use client';

import { Specimen, State } from '@/system/specimen';
import { Timeline, type TimelineItem } from '.';

const ROADMAP: TimelineItem[] = [
  { id: 'r1', group: 'Platform', label: 'Regional failover', start: '2026-08-04', end: '2026-10-16', tone: 'accent' },
  { id: 'r2', group: 'Platform', label: 'Rate limits per key', start: '2026-09-14', end: '2026-11-27' },
  { id: 'r3', group: 'Platform', label: 'Gateway v5', start: '2026-11-02', end: '2027-01-29' },
  { id: 'r4', group: 'Console', label: 'Alerts and on-call', start: '2026-07-20', end: '2026-09-04', tone: 'positive' },
  { id: 'r5', group: 'Console', label: 'Usage-based billing', start: '2026-09-28', end: '2026-12-18', tone: 'warning' },
  { id: 'r6', group: 'Assistants', label: 'MCP views for every page', start: '2026-10-05', end: '2027-01-15' },
];
const HEAT = { '2026-07': 2, '2026-08': 3, '2026-09': 5, '2026-10': 6, '2026-11': 5, '2026-12': 4, '2027-01': 2 };

export default function TimelinePreview() {
  return (
    <>
      <Specimen label="Roadmap" note="Bars run from start to end, grouped by workstream, on month hairlines; the accent line is today. The label column stays put; the plot is in percent, so it never scrolls sideways." stack>
        <State label="With a heat row (projects in flight)" className="w-full"><Timeline items={ROADMAP} from="2026-07-01" to="2027-01-31" today="2026-10-03" heat={HEAT} heatLabel="In flight" label="Roadmap, July 2026 to January 2027" /></State>
      </Specimen>
      <Specimen label="Narrow" note="Under 512px the label column narrows to 7rem and month labels shorten; nothing scrolls.">
        <State label="Phone width" className="w-90 max-w-full"><Timeline items={ROADMAP.slice(0, 3)} from="2026-08-01" to="2026-12-31" today="2026-10-03" label="Platform roadmap" /></State>
      </Specimen>
    </>
  );
}

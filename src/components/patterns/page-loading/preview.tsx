'use client';

import { Specimen, State } from '@/system/specimen';
import { Busy, ChartSkeleton, LeadRoom, TableSkeleton, TilesSkeleton } from '.';

export default function PageLoadingPreview() {
  return (
    <>
      <Specimen label="A body on its way" note="Announced once as busy under the page's name. The whole screen, masthead and shell around it, is held still at /system/states/loading." stack>
        <Busy name="customers">
          <TilesSkeleton />
          <TableSkeleton rows={5} />
        </Busy>
      </Specimen>
      <Specimen label="The room of a long sentence" note="The sentence under a page's title on its way, and arrived in the same room: one height, so nothing under the masthead moves. Three lines of the lead at its widest, more as its column narrows." stack>
        <State label="On its way" className="w-full"><p className="t-lead max-w-[60ch]"><LeadRoom /></p></State>
        <State label="Arrived" className="w-full">
          <p className="t-lead max-w-[60ch]">
            <LeadRoom>320 customers, 1.1B requests in 30 days (up 4.7%), and Inference API is degraded. For everyone who needs the whole product at a glance: how it is doing, who is in it and how it is set up.</LeadRoom>
          </p>
        </State>
      </Specimen>
      <Specimen label="Tiles" note="Three unless the page has another number." stack>
        <State label="Three (the default)" className="w-full *:first:w-full"><TilesSkeleton /></State>
        <State label="Two" className="w-full *:first:w-full"><TilesSkeleton count={2} /></State>
        <State label="Four" className="w-full *:first:w-full"><TilesSkeleton count={4} /></State>
      </Specimen>
      <Specimen label="Chart and table" stack>
        <State label="Chart" className="w-full *:first:w-full"><ChartSkeleton /></State>
        <State label="Chart, taller" className="w-full *:first:w-full"><ChartSkeleton height="h-64" /></State>
        <State label="Table with a filter bar" className="w-full *:first:w-full"><TableSkeleton rows={4} /></State>
        <State label="Table without filters" className="w-full *:first:w-full"><TableSkeleton rows={4} filters={false} /></State>
      </Specimen>
    </>
  );
}

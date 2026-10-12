'use client';

import { Specimen, State } from '@/system/specimen';
import { Busy, ChartSkeleton, TableSkeleton, TilesSkeleton } from '.';

export default function PageLoadingPreview() {
  return (
    <>
      <Specimen label="A body on its way" note="Announced once as busy under the page's name. The whole screen, masthead and shell around it, is held still at /system/states/loading." stack>
        <Busy name="customers">
          <TilesSkeleton />
          <TableSkeleton rows={5} />
        </Busy>
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

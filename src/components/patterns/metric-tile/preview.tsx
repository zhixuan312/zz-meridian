'use client';

import { useEffect } from 'react';
import { AlertTriangle, CircleDollarSign, Gauge, Zap } from 'lucide-react';
import { demoSeries } from '@/system/fixtures/relay';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { Specimen, State } from '@/system/specimen';
import { MetricTile } from '.';

const s = demoSeries('30d').current;
const dates = s.map((d) => d.date);

/** Points the shared cursor at one day, to show the reading state still. */
function PointAt({ i }: { i: number }) {
  const { setIndex } = useMeridian(dates);
  useEffect(() => setIndex(i), [setIndex, i]);
  return null;
}

export default function MetricTilePreview() {
  return (
    <>
      <Specimen label="Row of tiles" note="One tile per row may carry emphasis: its figure takes the accent ink and its sparkline the accent.">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Requests" hint="Every API call that reached the gateway." icon={<Zap />} value={2_943_120} delta={0.057} daily={s.map((d) => d.requests)} format={formatCompact} emphasis />
          <MetricTile label="Error rate" hint="Share of requests answered with a 5xx or a 429." icon={<AlertTriangle />} value={0.009} delta={0.13} intent="down" daily={s.map((d) => d.errors / d.requests)} format={(n) => formatPercent(n, 2)} />
          <MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={-0.014} intent="down" daily={s.map((d) => d.p95)} format={formatDuration} />
          <MetricTile label="Spend" icon={<CircleDollarSign />} value={298.43} delta={0.062} intent="neutral" daily={s.map((d) => d.spend)} format={formatCost} />
        </div>
      </Specimen>
      <Specimen label="Variants">
        <State label="No sparkline" className="w-64"><MetricTile label="Active keys" value={14} delta={0} format={(n) => String(n)} /></State>
        <State label="Nothing to compare" className="w-64"><MetricTile label="Webhooks delivered" value={21_070} delta={null} format={formatCompact} /></State>
      </Specimen>
      <Specimen label="Reading a day" note="When the page's Meridian points at a day, every tile reads that day and names it in place of the change.">
        <Meridian dates={dates}>
          <PointAt i={18} />
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <MetricTile label="Requests" icon={<Zap />} value={2_943_120} delta={0.057} daily={s.map((d) => d.requests)} format={formatCompact} emphasis />
            <MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={-0.014} intent="down" daily={s.map((d) => d.p95)} format={formatDuration} />
          </div>
        </Meridian>
      </Specimen>
    </>
  );
}

'use client';

import { useEffect } from 'react';
import { AlertTriangle, CircleDollarSign, Gauge, Zap } from 'lucide-react';
import { demoSeries } from '@/system/fixtures/sample';
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
      <Specimen label="Extreme values" note="The largest figures the formatters print, in the same row: an exact count in the billions, an enterprise month of spend, a slow p95 and a change of several hundred per cent.">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Requests" icon={<Zap />} value={9_876_543_210} delta={4.37} daily={s.map((d) => d.requests)} format="count" />
          <MetricTile label="Error rate" icon={<AlertTriangle />} value={1} delta={-0.999} intent="down" daily={s.map((d) => d.errors / d.requests)} format={(n) => formatPercent(n, 2)} />
          <MetricTile label="Latency p95" icon={<Gauge />} value={3_725_000} delta={12.5} intent="down" daily={s.map((d) => d.p95)} format={formatDuration} />
          <MetricTile label="Spend" icon={<CircleDollarSign />} value={1_234_567.89} delta={0.062} intent="neutral" daily={s.map((d) => d.spend)} format={formatCost} />
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
      <Specimen label="A finding, and what is usual" note="finding: one line computed by code that the number does not say, the same one both agents read; with a day it points the Meridian there. baseline: the daily median, so a day being read says how it compares.">
        <Meridian dates={dates}>
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <State label="At rest"><MetricTile label="Error rate" icon={<AlertTriangle />} value={0.009} delta={0.124} intent="down" daily={s.map((d) => d.errors / d.requests)} baseline={0.0081} finding={{ text: '2.7× usual on 21 and 22 Sept', day: dates[18] }} format={(n) => formatPercent(n, 2)} /></State>
            <State label="No day: a plain line"><MetricTile label="Error rate" icon={<AlertTriangle />} value={0.009} delta={0.124} intent="down" daily={s.map((d) => d.errors / d.requests)} baseline={0.0081} finding={{ text: '2.7× usual on 21 and 22 Sept' }} format={(n) => formatPercent(n, 2)} /></State>
          </div>
        </Meridian>
        <Meridian dates={dates}>
          <PointAt i={18} />
          <State label="Reading a day against usual" className="w-full sm:w-80"><MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={0.014} intent="down" daily={s.map((d) => d.p95)} baseline={296} format={formatDuration} /></State>
        </Meridian>
      </Specimen>
      <Specimen label="A word, not a number" note="A categorical state is a word set smaller than a figure; a named format (compact, cost-compact) lets a server page render the tile.">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <State label="Categorical value"><MetricTile label="Forecast" hint="Whether the trend points to a new customer segment." value="Likely new" note="Based on the last 14 days" /></State>
          <State label="Named format"><MetricTile label="Pipeline" hint="Open opportunities, in the workspace currency." value={1_240_000} format="cost-compact" delta={0.08} /></State>
        </div>
      </Specimen>
    </>
  );
}

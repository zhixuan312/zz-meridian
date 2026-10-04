'use client';

import { Specimen, Plane } from '@/system/specimen';
import { TrendChart } from '@/components/charts/trend-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { demoSeries } from '@/system/fixtures/sample';
import { formatCompact, formatDuration, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { Meridian, useMeridianIndex } from '.';

const { current } = demoSeries('30d');
const dates = current.map((d) => d.date);

function Readout() {
  const { index } = useMeridianIndex();
  const d = index !== null ? current[index] : current[current.length - 1];
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
      <div>
        <p className="t-eyebrow">{index !== null ? formatDate(d.date) : 'Today'}</p>
        <p className="t-figure t-num mt-2">{formatCompact(d.requests)}<span className="unit">requests</span></p>
      </div>
      <dl className="flex gap-6 pb-1 text-sm">
        <div><dt className="t-caption">Errors</dt><dd className="t-num font-medium">{formatPercent(d.errors / d.requests, 2)}</dd></div>
        <div><dt className="t-caption">p95</dt><dd className="t-num font-medium">{formatDuration(d.p95)}</dd></div>
      </dl>
      <div className="w-40 pb-1"><Sparkline values={current.map((x) => x.spend)} color="neutral" height={32} /></div>
    </div>
  );
}

export default function MeridianPreview() {
  return (
    <>
      <Specimen label="One cursor" note="Point at either chart, or focus one and use the arrow keys. Both charts, the readout and the sparkline follow the same day.">
        <Meridian dates={dates}>
          <Plane on="surface" className="flex flex-col gap-6">
            <Readout />
            <TrendChart label="Requests per day" dates={dates} height={200} series={[{ key: 'r', label: 'Requests', values: current.map((d) => d.requests), kind: 'area' }]} />
            <TrendChart label="Latency p95 per day" dates={dates} height={150} format="duration" series={[{ key: 'p', label: 'Latency p95', values: current.map((d) => d.p95), kind: 'line', color: 'neutral' }]} />
          </Plane>
        </Meridian>
      </Specimen>
      <Specimen label="Alone" note="Outside a Meridian, a chart keeps its own cursor and nothing else follows.">
        <Plane on="surface">
          <TrendChart label="Spend per day" dates={dates} height={150} format="cost" series={[{ key: 's', label: 'Spend', values: current.map((d) => d.spend), kind: 'line' }]} />
        </Plane>
      </Specimen>
    </>
  );
}

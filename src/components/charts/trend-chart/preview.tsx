'use client';

import { Specimen, Plane } from '@/system/specimen';
import { demoSeries, REGIONS } from '@/system/fixtures/sample';
import { TrendChart } from '.';

const { current, previous } = demoSeries('30d');
const dates = current.map((d) => d.date);
const REGION_TOTAL = REGIONS.reduce((a, r) => a + r.value, 0);

export default function TrendChartPreview() {
  return (
    <>
      <Specimen label="Area" note="The series the chart is about: a 2px line, a fading area and a soft glow. At most one per chart.">
        <Plane on="surface">
          <TrendChart label="Requests per day" dates={dates} series={[{ key: 'r', label: 'Requests', values: current.map((d) => d.requests), kind: 'area' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Against a reference" note="A dashed neutral line for the previous period or a target. Two series bring the legend.">
        <Plane on="surface">
          <TrendChart
            label="Requests per day, this period and the previous one"
            dates={dates}
            series={[
              { key: 'now', label: 'This period', values: current.map((d) => d.requests), kind: 'area' },
              { key: 'prev', label: 'Previous period', values: previous.map((d) => d.requests), kind: 'dashed' },
            ]}
          />
        </Plane>
      </Specimen>
      <Specimen label="Peers" note="Lines of equal standing take categorical slots in order: 1, 2, 3. Never a second y-axis.">
        <Plane on="surface">
          <TrendChart
            label="Latency per day by percentile"
            dates={dates}
            height={200}
            format="duration"
            series={[
              { key: 'p95', label: 'p95', values: current.map((d) => d.p95), kind: 'line', color: 1 },
              { key: 'p75', label: 'p75', values: current.map((d) => Math.round(d.p95 * 0.62)), kind: 'line', color: 2 },
              { key: 'p50', label: 'p50', values: current.map((d) => Math.round(d.p95 * 0.38)), kind: 'line', color: 3 },
            ]}
          />
        </Plane>
      </Specimen>
      <Specimen label="Stacked" note="Parts of one whole: each day's requests by region. The top edge is the total; the readout names each part, top to bottom, and the total. Parts with no meaning of their own take categorical slots, never status colours.">
        <Plane on="surface">
          <TrendChart
            label="Requests per day, by region"
            stacked
            dates={dates}
            series={REGIONS.map((r) => ({ key: r.label, label: r.label, values: current.map((d) => Math.round((d.requests * r.value) / REGION_TOTAL)) }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Short" note="180px or less: three gridlines. On phones the chart drops to 180px and to three or four date labels.">
        <Plane on="surface" className="max-w-md">
          <TrendChart label="Spend per day" dates={dates} height={150} format="cost" series={[{ key: 's', label: 'Spend', values: current.map((d) => d.spend), kind: 'line', color: 'accent' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Gaps" note="A day with no measurement is a gap, never a zero.">
        <Plane on="surface">
          <TrendChart label="Requests with two days missing" dates={dates} height={170} series={[{ key: 'r', label: 'Requests', values: current.map((d, i) => (i === 12 || i === 13 ? null : d.requests)), kind: 'line' }]} />
        </Plane>
      </Specimen>
    </>
  );
}

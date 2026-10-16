'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { demoSeries, REGIONS } from '@/system/fixtures/company';
import { TrendChart } from '.';

const { current, previous } = demoSeries('30d');
const dates = current.map((d) => d.date);
const REGION_TOTAL = REGIONS.reduce((a, r) => a + r.value, 0);
// The sample's clock stands at 09:00 UTC on its last day, so that day has run nine hours of its twenty-four.
const recent = current.slice(-14);
const soFar = recent.map((d, i) => (i === recent.length - 1 ? Math.round((d.requests * DEMO_NOW.getUTCHours()) / 24) : d.requests));
/** The sample's p95, with three days put over the band and one left low, as a day that left the band on its error rate would be. */
const SPIKED = new Set([4, 17, 26]);
const banded = current.map((d, i) => (i === 26 ? Math.round(d.p95 * 0.7) : SPIKED.has(i) ? Math.round(d.p95 * 1.9) : d.p95));

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
      <Specimen label="Against what is usual" note="baseline: the period's median as a dashed hairline under the data, named at an end of it. A spike reads against it at a glance. The label stands 6px over the right end unless a series is drawn there; then it takes the nearest place beside the dashed line that no series crosses. The sample's p95 runs along its median, so here the label has moved clear of it.">
        <Plane on="surface">
          <TrendChart
            label="Latency p95 per day"
            height={168}
            format="duration"
            dates={dates}
            series={[{ key: 'p95', label: 'Latency p95', values: current.map((d) => d.p95), kind: 'line', color: 'neutral' }]}
            baseline={{ value: 296, label: 'Median 296ms' }}
          />
        </Plane>
      </Specimen>
      <Specimen label="Inside a band" note="band: the region the page is judged against, from the floor up to its ceiling, in the track's own wash, its top edge drawn as the axis is and named at an end of it. marks: the days the page names, a dot on the day's own point and a stem to the axis. The third day here left the band on something this chart does not draw, so its point stands inside the region — which is why a mark is a stem and not only a dot.">
        <Plane on="surface">
          <TrendChart
            label="Latency p95 per day"
            height={168}
            format="duration"
            dates={dates}
            series={[{ key: 'p95', label: 'Latency p95', values: banded, kind: 'line' }]}
            band={{ value: 350, label: 'Band: p95 under 350 ms' }}
            marks={{ dates: [dates[4], dates[17], dates[26]], tone: 'warning', label: '3 days outside the band' }}
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
      <Specimen label="Stacked" note="Parts of one whole: each day's requests by region. The top edge is the total; the readout names each part, top to bottom, and the total. The parts share the accent's hue, deepest at the bottom; the total is the lit line, as on the single-series area.">
        <Plane on="surface">
          <TrendChart
            label="Requests per day, by region"
            stacked
            dates={dates}
            series={REGIONS.map((r) => ({ key: r.label, label: r.label, values: current.map((d) => Math.round((d.requests * r.value) / REGION_TOTAL)) }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Running" note="running: the last point is a period not over yet, here today at 09:00 UTC. Everything solid stops at yesterday: the stretch into today is 1.5px and dashed in the line's colour, with no area and no glow under it. Its readout says so far. Stacked, the bands stop too and only the total goes on." stack>
        <State label="Rest" className="w-full">
          <Plane on="surface">
            <TrendChart label="Requests per day, today so far" height={200} running dates={recent.map((d) => d.date)} series={[{ key: 'r', label: 'Requests', values: soFar, kind: 'area' }]} />
          </Plane>
        </State>
        <State label="Reading the running day" className="w-full">
          <Plane on="surface">
            <TrendChart label="Requests per day, with today read" height={200} running data-preview-index={recent.length - 1} dates={recent.map((d) => d.date)} series={[{ key: 'r', label: 'Requests', values: soFar, kind: 'area' }]} />
          </Plane>
        </State>
        <State label="Stacked" className="w-full">
          <Plane on="surface">
            <TrendChart
              label="Requests per day by region, today so far"
              height={200}
              stacked
              running
              dates={recent.map((d) => d.date)}
              series={REGIONS.map((r) => ({ key: r.label, label: r.label, values: soFar.map((v) => Math.round((v * r.value) / REGION_TOTAL)) }))}
            />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Short" note="Under 200px the chart draws three gridlines instead of four, and three or four date labels; drawn here at 150px. A chart told to `fill` takes the height its card gives it, never under 220px.">
        <Plane on="surface" className="max-w-md">
          <TrendChart label="Revenue per day" dates={dates} height={150} format="cost" series={[{ key: 's', label: 'Revenue', values: current.map((d) => d.revenue), kind: 'line', color: 'accent' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Gaps" note="A day with no measurement is a gap, never a zero.">
        <Plane on="surface">
          <TrendChart label="Requests with two days missing" dates={dates} height={170} series={[{ key: 'r', label: 'Requests', values: current.map((d, i) => (i === 12 || i === 13 ? null : d.requests)), kind: 'line' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Readout · long labels and extreme values" note="The readout stays inside a narrow chart. Labels wrap and exact values remain readable; a phone pins the readout to the plot's leading edge.">
        <Plane on="surface" className="max-w-md">
          <TrendChart
            label="Metered inference spend after automatic retries"
            dates={dates}
            height={200}
            format="cost"
            data-preview-index={17}
            series={[{ key: 'cost', label: 'Metered inference spend after automatic retries', values: current.map((d) => d.revenue * 1_000_000_000), kind: 'line' }]}
          />
        </Plane>
      </Specimen>
    </>
  );
}

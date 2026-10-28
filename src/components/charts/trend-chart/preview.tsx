'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { demoSeries, REGIONS } from '@/system/fixtures/company';
import { AXIS_FORMATTERS } from '@/lib/format';
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
/** Six services' share operational a day: 1 on almost every day, with a service down on five of them. */
const DOWN = new Set([3, 11, 12, 19, 27]);
const uptime = current.map((_, i) => (DOWN.has(i) ? 5 / 6 : 1));
/** Seats on a plan: a count that changes only when someone is added or removed, and holds between. */
const seats = current.map((_, i) => (i < 6 ? 12 : i < 14 ? 15 : i < 22 ? 14 : 20));
/** Five weekly readings over the month. */
const weekly = [0, 7, 14, 21, current.length - 1];

/** A day's requests less the day before's: rises and falls about zero. */
const change = current.slice(1).map((d, i) => d.requests - current[i].requests);
/** A change reads with its sign, and a fall with the true minus sign: exact in the readout, short on the axis. */
const sign = (read: (n: number) => string) => (n: number) => (n > 0 ? `+${read(n)}` : n < 0 ? `\u2212${read(-n)}` : read(0));
const signed = sign((n) => n.toLocaleString('en-US'));
const signedAxis = sign((n) => AXIS_FORMATTERS.count(n));
/** A price that lives a few ten-thousandths about par, which no named format reads exactly. */
const price = current.map((d, i) => Math.round((1 + Math.sin(i / 3) * 0.0004 + (d.requests % 7) * 0.00002) * 10_000) / 10_000);

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
      <Specimen label="A quantity that never nears zero" note="floor: for uptime, a success rate, a hit rate — a quantity that is 100% on almost every day. On an axis from zero the one thing the card is about is the smallest mark on it; the axis starts at the nearest step under the floor instead, and under the data whenever a day falls further, since a floor is a hint and never a crop. For line and dashed series only: an area is read by its height, which a floor changes the meaning of.">
        <Plane on="surface">
          <TrendChart
            label="Share of the services operational, a day"
            height={168}
            format="percent"
            dates={dates}
            floor={0.7}
            series={[{ key: 'operational', label: 'Operational', values: uptime, kind: 'line' }]}
          />
        </Plane>
      </Specimen>
      <Specimen label="Below zero" note="A signed series, here each day's requests less the day before's. Without a floor the axis holds zero and every value: it goes under zero for a fall, zero is drawn as the axis, and an area is filled to the zero line from either side. The readout is exact and signed; axisFormat keeps the ticks short.">
        <Plane on="surface">
          <TrendChart label="Change in requests, day on day" height={168} format={signed} axisFormat={signedAxis} dates={dates.slice(1)} series={[{ key: 'c', label: 'Change', values: change, kind: 'area' }]} />
        </Plane>
      </Specimen>
      <Specimen label="A format of its own" note="format as a function, from a client component: for a figure no name says exactly, here a price to four decimals, read in the readout and the table, with axisFormat for the ticks. A server component names its format, since a function cannot cross into a client one.">
        <Plane on="surface">
          <TrendChart label="Price a day" height={168} format={(n) => n.toFixed(4)} axisFormat={(n) => n.toFixed(4)} floor={0.999} dates={dates} series={[{ key: 'p', label: 'Price', values: price, kind: 'line' }]} />
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
      <Specimen label="Straight lines" note="curve, set to linear: straight segments between readings, for a few of them, here three over a month. A smooth curve would invent the shape between them; a straight line claims only that the readings are joined. The default stays smooth, which suits a reading every day.">
        <Plane on="surface">
          <TrendChart
            label="Requests, three readings over a month"
            dates={[0, 14, current.length - 1].map((i) => dates[i])}
            curve="linear"
            series={[{ key: 'r', label: 'Requests', values: [0, 14, current.length - 1].map((i) => current[i].requests), kind: 'line' }]}
          />
        </Plane>
      </Specimen>
      <Specimen label="Steps" note="curve, set to step: each value is held level until the next one, then the line moves straight to it. For a balance that changes at events — seats on a plan, a credit balance, a limit — where a slope between two days would claim a change nobody made. A stack's parts and its running stretch step too.">
        <Plane on="surface">
          <TrendChart label="Seats on the plan a day" height={168} whole curve="step" dates={dates} series={[{ key: 's', label: 'Seats', values: seats, kind: 'line' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Points" note="points: a dot on each measured value of every line and area, ringed in the card's colour, for a few readings where each one is a fact worth finding. None on a dashed reference or a stack, and none once the readings would stand under 6px apart, where the dots become a thicker line.">
        <Plane on="surface">
          <TrendChart label="Requests, five weekly readings" height={168} points curve="linear" dates={weekly.map((i) => dates[i])} series={[{ key: 'r', label: 'Requests', values: weekly.map((i) => current[i].requests), kind: 'line' }]} />
        </Plane>
      </Specimen>
      <Specimen label="A held scale" note="domain: the plot ends at a stated range, here 80% to 100% of the services operational, on levels that end exactly at both ends, so charts read side by side share their scale. A line is held to the domain's lower end; an area and a stack are drawn from zero.">
        <Plane on="surface">
          <TrendChart label="Share of the services operational, a day" height={168} format="percent" domain={[0.8, 1]} dates={dates} series={[{ key: 'operational', label: 'Operational', values: uptime, kind: 'line' }]} />
        </Plane>
      </Specimen>
      <Specimen label="A held scale, widened" note="A value outside the domain is never cropped: the scale widens to the nice levels that take every value, and the chart says so in a line above the plot and in its table, here a day at 83% under a domain from 90%.">
        <Plane on="surface">
          <TrendChart label="Share of the services operational, a day" height={168} format="percent" domain={[0.9, 1]} dates={dates} series={[{ key: 'operational', label: 'Operational', values: uptime, kind: 'line' }]} />
        </Plane>
      </Specimen>
      <Specimen label="A held scale under an area" note="An area is read by its height, so on a domain it is drawn from zero, never from the domain's lower end, and its widening line names the range it was drawn on: here seats held at 10 to 16 are drawn from 0 to 16, widened for the days at 20.">
        <Plane on="surface">
          <TrendChart label="Seats on the plan a day" height={168} whole curve="step" domain={[10, 16]} dates={dates} series={[{ key: 's', label: 'Seats', values: seats, kind: 'area' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Short" note="Under 200px the chart draws three gridlines instead of four, and three or four date labels; drawn here at 150px. A chart told to `fill` takes the height its card gives it, never under 220px.">
        <Plane on="surface" className="max-w-md">
          <TrendChart label="Revenue per day" dates={dates} height={150} format="cost" series={[{ key: 's', label: 'Revenue', values: current.map((d) => d.revenue), kind: 'line', color: 'accent' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Gaps" note="A day with no measurement is a gap, never a zero. Stacked, a day no part was measured on breaks every band and the total there; a day some parts were measured on keeps its stack, the missing part standing on the ones below it." stack>
        <State label="A line" className="w-full">
          <Plane on="surface">
            <TrendChart label="Requests with two days missing" dates={dates} height={170} series={[{ key: 'r', label: 'Requests', values: current.map((d, i) => (i === 12 || i === 13 ? null : d.requests)), kind: 'line' }]} />
          </Plane>
        </State>
        <State label="Stacked" className="w-full">
          <Plane on="surface">
            <TrendChart
              label="Requests per day by region, two days missing"
              stacked
              height={170}
              dates={dates}
              series={REGIONS.map((r) => ({ key: r.label, label: r.label, values: current.map((d, i) => (i === 12 || i === 13 ? null : Math.round((d.requests * r.value) / REGION_TOTAL))) }))}
            />
          </Plane>
        </State>
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

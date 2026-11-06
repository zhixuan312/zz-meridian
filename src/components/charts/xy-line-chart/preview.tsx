'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { formatPercent } from '@/lib/format';
import { XYLineChart, type XYSeries } from '.';

/** The share of requests served at or under each latency: a step line over milliseconds, as a distribution is read. */
const LATENCY: XYSeries[] = [{
  key: 'served',
  label: 'Answered within',
  points: [20, 40, 60, 80, 100, 120, 160, 200, 250, 300, 400, 600].map((x) => ({ x, y: Math.min(0.995, 1 - Math.exp(-x / 90)) })),
}];
const ms = (n: number) => `${n} ms`;
const share = (n: number) => formatPercent(n, 1);

export default function XYLineChartPreview() {
  return (
    <>
      <Specimen label="A measure over a number" note="A latency distribution: the share of requests answered within x milliseconds. The x positions are the latencies themselves, which no index-placed chart allows. A step line says what a distribution is: the share holds at or under each threshold and rises only at the next.">
        <Plane on="surface">
          <XYLineChart label="Share of requests answered within each latency" series={LATENCY} xLabel="Latency, ms" yLabel="Share of requests" xFormat={ms} format={share} curve="step" references={[{ x: 250, label: 'Budget' }]} />
        </Plane>
      </Specimen>
      <Specimen label="Straight lines over a number" note="curve set to linear, for a quantity read against a reference price: each point is a measurement and a straight line joins them, claiming no shape between two readings.">
        <Plane on="surface">
          <XYLineChart
            label="Quantity available within each distance from the reference"
            xLabel="Basis points from reference"
            yLabel="Quantity available"
            xFormat={ms}
            curve="linear"
            series={[
              { key: 'bid', label: 'Bids', points: [-80, -60, -40, -20, 0, 20, 40, 60, 80].map((x) => ({ x, y: Math.round(400 * Math.exp(-((x + 10) ** 2) / 1400)) })) },
              { key: 'ask', label: 'Asks', points: [-80, -60, -40, -20, 0, 20, 40, 60, 80].map((x) => ({ x, y: -Math.round(380 * Math.exp(-((x - 12) ** 2) / 1600)) })) },
            ]}
          />
        </Plane>
      </Specimen>
      <Specimen label="A held y-range" note="A domain holds the y-scale, as the Trend chart's does, so two charts read side by side share their levels. A value outside the range is never cropped: the scale widens and says which range it drew.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Plane on="surface">
            <XYLineChart label="Share answered, this hour" series={[LATENCY[0]]} xLabel="Latency, ms" yLabel="Share" xFormat={ms} format={share} curve="step" domain={[0, 1]} />
          </Plane>
          <Plane on="surface">
            <XYLineChart
              label="Share answered, the hour before"
              series={[{ key: 'served', label: 'Answered within', points: LATENCY[0].points.map((p) => ({ x: p.x * 1.6, y: p.y })) }]}
              xLabel="Latency, ms"
              yLabel="Share"
              xFormat={(n) => `${Math.round(n)} ms`}
              format={share}
              curve="step"
              domain={[0, 1]}
            />
          </Plane>
        </div>
      </Specimen>
      <Specimen label="A point with no value" note="A point with no y is a gap: the line breaks there, never dipping to zero, and the table says 'No value' in its cell.">
        <Plane on="surface">
          <XYLineChart
            label="Share answered, with one threshold unmeasured"
            series={[{ key: 'served', label: 'Answered within', points: LATENCY[0].points.map((p) => (p.x === 160 ? { x: p.x, y: null } : p)) }]}
            xLabel="Latency, ms"
            yLabel="Share"
            xFormat={ms}
            format={share}
            curve="step"
          />
        </Plane>
      </Specimen>
      <Specimen label="Nothing measured" note="A chart with no points: the Empty state of its card, never a line drawn at zero.">
        <State label="No points" className="w-full">
          <Plane on="surface">
            <XYLineChart label="Nothing measured" series={[{ key: 'x', label: 'Answered within', points: [] }]} xLabel="Latency, ms" yLabel="Share" xFormat={ms} format={share} />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

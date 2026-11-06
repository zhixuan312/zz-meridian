'use client';

import { Specimen, Plane, State } from '@/system/specimen';
import { AXIS_FORMATTERS, formatDuration } from '@/lib/format';
import { RangeStrip, type RangeItem } from '.';

/** Every endpoint's lowest and median latency for the day, which is the range its requests span. */
const ENDPOINTS: { key: string; label: string; from: number; to: number }[] = [
  { key: 'messages', label: '/v1/messages', from: 180, to: 391 },
  { key: 'embeddings', label: '/v1/embeddings', from: 90, to: 142 },
  { key: 'completions', label: '/v1/completions', from: 210, to: 512 },
  { key: 'images', label: '/v1/images', from: 640, to: 1_240 },
  { key: 'audio', label: '/v1/audio', from: 320, to: 480 },
];
const items = (xs: typeof ENDPOINTS): RangeItem[] => xs.map((e) => ({ key: e.key, label: e.label, from: e.from, to: e.to }));
const CEILING = { value: 350, label: 'Ceiling' };

export default function RangeStripPreview() {
  return (
    <>
      <Specimen label="A range per row" note="Each row's own span from one value to the other, its ends marked, on one shared scale, with the ceiling as a line across every row. A grouped column chart would show the two values and lose the range; a Bar list draws one value; a Diverging bars chart is signed about zero.">
        <Plane on="surface">
          <RangeStrip label="Lowest and median latency by endpoint" items={items(ENDPOINTS)} format={(n) => formatDuration(n)} references={[CEILING]} />
        </Plane>
      </Specimen>
      <Specimen label="Held at one scale" note="A domain holds the scale so two charts read side by side compare row by row: both below are held to 0–1,500 ms. A value outside the range is never clipped: the scale widens to take it and the line above the rows names the range it drew.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Plane on="surface">
            <RangeStrip label="Latency, this hour" items={items(ENDPOINTS.slice(0, 3))} format={(n) => formatDuration(n)} references={[CEILING]} domain={[0, 1500]} />
          </Plane>
          <Plane on="surface">
            <RangeStrip label="Latency, the hour before" items={items(ENDPOINTS.slice(2))} format={(n) => formatDuration(n)} references={[CEILING]} domain={[0, 1500]} />
          </Plane>
        </div>
      </Specimen>
      <Specimen label="One end missing" note="A missing end is drawn as missing, never as zero: a row with only a `to` starts at the plot's edge with no mark and reads 'up to 640ms', and a row with only a `from` says 'from 480ms'. The table says which end is absent.">
        <Plane on="surface">
          <RangeStrip
            label="Latency where an end was not measured"
            items={[
              { key: 'a', label: '/v1/messages', from: 180, to: 391 },
              { key: 'b', label: '/v1/embeddings', from: null, to: 142 },
              { key: 'c', label: '/v1/completions', from: 210, to: null },
              { key: 'd', label: '/v1/images', from: null, to: null },
            ]}
            format={(n) => formatDuration(n)}
            references={[CEILING]}
          />
        </Plane>
      </Specimen>
      <Specimen label="One row the card is about" note="highlight and highlightLabel: the row worth pointing at takes the accent, and what makes it that row is said on it, as every other chart here says it.">
        <Plane on="surface">
          <RangeStrip label="Lowest and median latency by endpoint" items={items(ENDPOINTS)} format={(n) => formatDuration(n)} references={[CEILING]} highlight="images" highlightLabel="The widest range" />
        </Plane>
      </Specimen>
      <Specimen label="Two references" note="A row is often read against two levels at once: the ceiling the page is judged by, and the median of the hour before. Each is a line across every row, named once under the chart.">
        <Plane on="surface">
          <RangeStrip label="Latency against two levels" items={items(ENDPOINTS.slice(0, 4))} format={(n) => AXIS_FORMATTERS.count(n)} references={[CEILING, { value: 260, label: 'Last hour' }]} />
        </Plane>
      </Specimen>
      <Specimen label="No value at all" note="A table whose rows were read but measured nothing: the Empty state of its card, never a strip drawn at zero.">
        <State label="Every row with no value" className="w-full">
          <Plane on="surface">
            <RangeStrip label="Latency, nothing measured" items={[{ key: 'a', label: '/v1/messages', from: null, to: null }]} format={(n) => formatDuration(n)} />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { demoHeatmap, demoSeries } from '@/system/fixtures/sample';
import { formatCompact } from '@/lib/format';
import { Heatmap } from '.';

const values = demoHeatmap();
/** The same week with one runaway hour, Thursday 03:00, at sixteen times its usual load. */
const outlier = values.map((row, d) => row.map((v, h) => (d === 3 && h === 3 ? v * 16 : v)));
/** 360 days ending on the sample's today: the 180 days of its longest period and the 180 before them. */
const { previous, current } = demoSeries('all');
const year = [...previous, ...current].map((d) => ({ date: d.date, value: d.requests }));
/** The sample's today is read at 09:00 UTC: three eighths of the day's requests have come so far. */
const today = year.map((d, i) => (i === year.length - 1 ? { ...d, value: Math.round(d.value * 0.375) } : d));

export default function HeatmapPreview() {
  return (
    <>
      <Specimen label="By hour" note="Twenty-four columns, Monday first, UTC. An empty track, then five steps of the accent; the legend names the empty step in words.">
        <Plane on="surface">
          <Heatmap label="Requests by weekday and hour" values={values} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="Grouped" note="Under 560px of width the hours group in threes: eight columns, each still large enough to point at.">
        <Plane on="surface" className="max-w-sm">
          <Heatmap label="Requests by weekday and three-hour block" values={values} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="A year of days" note="days: a cell a date, a column a week of Monday to Sunday, a month named above the column that holds its first day. The cells share the width, and every day keeps the step it earns among all the days given.">
        <Plane on="surface">
          <Heatmap label="Requests a day over the last year" days={year} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="The latest weeks that fit" note="A cell is never under 12px: a narrower figure draws as many of the latest weeks as fit and says how many of how many. The table still lists every day.">
        <Plane on="surface" className="max-w-sm">
          <Heatmap label="Requests a day over the latest weeks" days={year} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="A day in progress" note="running: the last day wears a dashed outline around a smaller fill, and its readout and its row of the table say so far. Drawn at 12px a cell, where it has least room.">
        <Plane on="surface" className="max-w-sm">
          <Heatmap label="Requests a day, with today so far" days={today} running format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="A day pointed at" note="The ring the hours form's cell takes, and the readout over the day's row: its date, then its value. The readout slides along the grid with its column and never leaves it. With meridian, the page's Meridian points at the same day when it holds it.">
        <State label="By the pointer, or by the arrow keys on the focused grid" still className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests a day, pointed at 20 Aug 2026" days={year} format={formatCompact} data-preview-date="2026-08-20" />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="One outlier hour" stack note="A batch job at 03:00 on Thursday. On max a cell is its share of the busiest cell, so one outlier flattens the week. On quantile the cells are ranked into five steps of equal count, and the legend reads the value the top step starts at.">
        <State label="max, the default" className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests by weekday and hour, with one outlier, on max" values={outlier} format={formatCompact} />
          </Plane>
        </State>
        <State label="quantile" className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests by weekday and hour, with one outlier, on quantile" values={outlier} format={formatCompact} scale="quantile" />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

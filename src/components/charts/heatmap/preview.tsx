'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { demoHeatmap, demoSeries } from '@/system/fixtures/sample';
import { formatCompact } from '@/lib/format';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { Heatmap } from '.';

const values = demoHeatmap();
/** The same week with one runaway hour, Thursday 03:00, at sixteen times its usual load. */
const outlier = values.map((row, d) => row.map((v, h) => (d === 3 && h === 3 ? v * 16 : v)));
/** 360 days ending on the sample's today: the 180 days of its longest period and the 180 before them. */
const { previous, current } = demoSeries('all');
const year = [...previous, ...current].map((d) => ({ date: d.date, value: d.requests }));
/** The sample's today is read at 09:00 UTC: three eighths of the day's requests have come so far. */
const soFar = (days: typeof year) => days.map((d, i) => (i === days.length - 1 ? { ...d, value: Math.round(d.value * 0.375) } : d));
/** The latest 26 weeks, from Monday 6 Apr 2026: few enough that every week fits the Atlas's column, at a cell well over 12px. */
const half = year.slice(-181);
/** The same weeks with two days on which nothing came. */
const quiet = half.map((d) => (d.date === '2026-08-11' || d.date === '2026-08-12' ? { ...d, value: 0 } : d));
/** The page's Meridian in the last specimen: the last 30 days, pointed at a Thursday. */
const month = demoSeries('30d').current;
const POINTED = '2026-09-24';

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
      <Specimen wide label="A year of days" note="days: a cell a date, a column a week of Monday to Sunday, a month named above the column that holds its first day. From 774px of width all 52 weeks fit and the cells share the width; every day keeps the step it earns among all the days given. A narrower figure, and any phone, draws the latest weeks that fit: the next specimen.">
        <Plane on="surface">
          <Heatmap label="Requests a day over the last year" days={year} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="The latest weeks that fit" note="A cell is never under 12px: a narrower figure draws as many of the latest weeks as fit and says how many of how many. The table still lists every day.">
        <Plane on="surface" className="max-w-sm">
          <Heatmap label="Requests a day over the latest weeks" days={year} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="Half a year" note="Fewer weeks share the same width, so a cell grows: square up to 28px, then wider than tall. Where a row is 16px or more all seven weekdays are named; a shorter row names Monday, Wednesday and Friday, as the specimens above do.">
        <Plane on="surface">
          <Heatmap label="Requests a day over the last 26 weeks" days={half} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="A day of zero" note="A day of zero, or below it, is the empty track, the step the legend names in words: Tuesday 11 and Wednesday 12 August here. It is still a cell, with its date and its value in the readout and the table.">
        <Plane on="surface">
          <Heatmap label="Requests a day, with two days of none" days={quiet} format={formatCompact} />
        </Plane>
      </Specimen>
      <Specimen label="A day in progress" stack note="running: the last day wears a dashed outline around a smaller fill, and its readout and its row of the table say so far. The outline is drawn an edge at a time on the pixel grid, so its four edges weigh the same at any size.">
        <State label="At 12px a cell, where it has least room" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <Heatmap label="Requests a day, with today so far" days={soFar(year)} running format={formatCompact} />
          </Plane>
        </State>
        <State label="Read: the readout says so far, flush with the grid's edge at the last week" still className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests a day, with today so far and read" days={soFar(half)} running format={formatCompact} data-preview-date={half[half.length - 1].date} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="A day pointed at" note="The ring the hours form's cell takes, and the readout over the day's row: its date, then its value. The readout takes its place from the weeks before its own and the weeks after, and never leaves the grid.">
        <State label="By the pointer, or by the arrow keys on the focused grid" still className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests a day, pointed at 20 Aug 2026" days={half} format={formatCompact} data-preview-date="2026-08-20" />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="An hour pointed at" stack note="The same ring and readout on a week of hours: the value, then the weekday and the hour. The readout takes its place from the columns before its own and the columns after: centred at the middle of the grid, flush with its edge at the first column and at the last.">
        <State label="The last column" still className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests by weekday and hour, pointed at Thursday 23:00" values={values} format={formatCompact} data-preview-cell="3-23" />
          </Plane>
        </State>
        <State label="The first column, grouped" still className="w-full">
          <Plane on="surface" className="max-w-sm">
            <Heatmap label="Requests by weekday and three-hour block, pointed at Wednesday 00:00" values={values} format={formatCompact} data-preview-cell="2-0" />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Focus" stack note="Either grid is one Tab stop. Focused from the keyboard it wears a 2px accent outline, 4px off, round the cells and nothing else: the weekday names and the hour or month labels stand outside it on both forms.">
        <State label="A week of hours" still className="w-full">
          <Plane on="surface" className="max-w-sm">
            <Heatmap label="Requests by weekday and three-hour block, focused" values={values} format={formatCompact} data-preview-state="focus" />
          </Plane>
        </State>
        <State label="A calendar of days" still className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests a day over the last 26 weeks, focused" days={half} format={formatCompact} data-preview-state="focus" />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Empty" stack note="Nothing to rank: every cell is the empty track and the legend's upper end reads More on either scale. The card says so in words. With no days at all a calendar draws no grid, and the Empty state is the card's.">
        <State label="A week of hours with no requests, on max" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <Heatmap label="Requests by weekday and three-hour block, with none" values={values.map((row) => row.map(() => 0))} format={formatCompact} />
          </Plane>
        </State>
        <State label="26 weeks of days with no requests, on quantile" className="w-full">
          <Plane on="surface">
            <Heatmap label="Requests a day over the last 26 weeks, with none" days={half.map((d) => ({ ...d, value: 0 }))} format={formatCompact} scale="quantile" />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="On the page's Meridian" note="meridian: pointing at a day of the calendar points the page's Meridian at it when the Meridian holds that date, so every chart on the page marks the same day. This Meridian holds the last 30 days; a day before them clears it, and letting go clears it.">
        <State label="Thursday 24 September pointed at on the calendar, and marked on the chart of the last 30 days" still className="w-full">
          <Meridian dates={month.map((d) => d.date)} day={POINTED}>
            <Plane on="surface" className="flex flex-col gap-6">
              <Heatmap label="Requests a day over the last 26 weeks, on the page's Meridian" days={half} format={formatCompact} meridian data-preview-date={POINTED} />
              <TrendChart label="Requests per day over the last 30 days" height={160} dates={month.map((d) => d.date)} series={[{ key: 'r', label: 'Requests', values: month.map((d) => d.requests), kind: 'area' }]} />
            </Plane>
          </Meridian>
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

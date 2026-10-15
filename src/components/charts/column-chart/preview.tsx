'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { DEMO_NOW, type DailyPoint } from '@/system/fixtures/sample';
import { demoSeries, ENDPOINTS, REGIONS, STATUS_MIX } from '@/system/fixtures/company';
import { AXIS_FORMATTERS, formatCompact } from '@/lib/format';
import { formatShortDate } from '@/lib/format-date';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart, type ColumnPart, type StackedColumn } from '.';

const week = demoSeries('7d').current;
const fortnight = demoSeries('30d').current.slice(-14);
const month = demoSeries('30d').current;
const quarter = demoSeries('90d').current;
const year = demoSeries('all').current;
/** A chart whose columns are periods names each one's date, so its labels thin as dates do and are never cut. */
const dates = (days: DailyPoint[]) => days.map((d) => d.date);
/** The axis reads a scale, true at every tick. Errors, in the hundreds and low thousands, are exact counts at rest; requests, in the tens of thousands, are compact. */
const axis = AXIS_FORMATTERS.count;
const sum = (xs: { value: number }[]) => xs.reduce((a, x) => a + x.value, 0);

/** The sample keeps one split of its requests for the whole period, so a day's parts are the day's requests in those shares. */
const split = (days: DailyPoint[], shares: number[], requests = (d: DailyPoint) => d.requests): StackedColumn[] => {
  const whole = shares.reduce((a, b) => a + b, 0);
  return days.map((d) => ({ key: d.date, label: formatShortDate(d.date), values: shares.map((s) => Math.round((requests(d) * s) / whole)) }));
};

const regions: ColumnPart[] = REGIONS.map((r) => ({ key: r.label, label: r.label }));
const byRegion = REGIONS.map((r) => r.value);
/** How a request ended. The usual case is the quiet one; only an outcome that needs somebody carries a status colour. */
const outcomes: ColumnPart[] = [
  { key: 'answered', label: 'Answered', tone: 'neutral' },
  { key: 'client', label: 'Client errors', tone: 'warning' },
  { key: 'server', label: 'Server errors', tone: 'critical' },
];
const byOutcome = [sum(STATUS_MIX.slice(0, 2)), STATUS_MIX[2].value, STATUS_MIX[3].value];
const endpoints: ColumnPart[] = ENDPOINTS.map((e) => ({ key: e.route, label: e.route.replace('/v1/', '') }));
const byEndpoint = ENDPOINTS.map((e) => e.requests);
// The sample's clock stands at 09:00 UTC on its last day, so that day has run nine hours of its twenty-four.
const soFar = (d: DailyPoint) => (d === week[week.length - 1] ? Math.round((d.requests * DEMO_NOW.getUTCHours()) / 24) : d.requests);
const errors = (days: DailyPoint[]) => days.map((d) => ({ key: d.date, label: formatShortDate(d.date), value: d.errors }));
// The sample has no day of zero, so the zero specimens make one: a day with no errors, a day with no requests at all,
// and a day with none from one region.
const noErrors = errors(week).map((c, i) => (i === 2 ? { ...c, value: 0 } : c));
const noRequests = split(week, byRegion).map((c, i) => (i === 2 ? { ...c, values: c.values.map(() => 0) } : i === 4 ? { ...c, values: c.values.map((v, k) => (k === 2 ? 0 : v)) } : c));
// The sample reads every day, so the no-data specimens make the gaps: a day whose figures could not be read, a day with
// nothing from any region and one with nothing from one region, and today before anything has arrived.
const unread = errors(week).map((c, i) => (i === 2 ? { ...c, value: null } : c));
const unreadParts = split(week, byRegion).map((c, i) => (i === 2 ? { ...c, values: c.values.map(() => null) } : i === 4 ? { ...c, values: c.values.map((v, k) => (k === 1 ? null : v)) } : c));
const nothingYet = errors(week).map((c, i) => (i === week.length - 1 ? { ...c, value: null } : c));
/** The ring the focused plot takes, as a class: a specimen cannot hold the keyboard's focus. */
const FOCUS = '[&_[data-plot]]:outline-2 [&_[data-plot]]:outline-offset-4 [&_[data-plot]]:outline-accent';

export default function ColumnChartPreview() {
  return (
    <>
      <Specimen label="Categories" note="One column per category, the neutral population, one highlighted. A column of 36px or more keeps its value above it. The axis takes an axis formatter, so every tick reads the value it stands at.">
        <Plane on="surface">
          <ColumnChart
            label="Requests by endpoint"
            format={formatCompact}
            axisFormat={axis}
            highlight="/v1/messages"
            columns={ENDPOINTS.map((e) => ({ key: e.route, label: e.route.replace('/v1/', ''), value: e.requests }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Days" note="Seven days of errors; today highlighted. The columns are periods, so the chart is given their dates: the labels thin as dates do and are never cut.">
        <Plane on="surface" className="max-w-lg">
          <ColumnChart label="Errors per day, last 7 days" height={160} axisFormat={axis} highlight={week[week.length - 1].date} dates={dates(week)} columns={errors(week)} />
        </Plane>
      </Specimen>
      <Specimen label="On the Meridian" note="Given dates, the columns share the page's cursor: point at a column, or move through them with the arrow keys, and the trend above follows.">
        <Meridian dates={dates(month)}>
          <Plane on="surface" className="flex flex-col gap-6">
            <TrendChart label="Requests per day" dates={dates(month)} height={160} series={[{ key: 'r', label: 'Requests', values: month.map((d) => d.requests), kind: 'area' }]} />
            <ColumnChart label="Errors per day" height={160} axisFormat={axis} dates={dates(month)} columns={errors(month)} />
          </Plane>
        </Meridian>
      </Specimen>
      <Specimen label="Parts of a whole" note="parts: each column is a day's requests split by region, the first part at the bottom. The parts are one kind of thing, so they share the accent, deepest at the bottom and paler upward, with a hairline of the card where two touch. The axis and the value above a column are the total.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by region" format={formatCompact} axisFormat={axis} dates={dates(week)} parts={regions} columns={split(week, byRegion)} />
        </Plane>
      </Specimen>
      <Specimen label="Outcomes" note="A tone a part: the usual outcome is neutral, and one that needs somebody is warning or critical, named in the legend. The accent never stands beside a tone. A part that is not zero is at least 3px tall, so a day's server errors are never lost under its answers.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by how they were answered" format={formatCompact} axisFormat={axis} dates={dates(week)} parts={outcomes} columns={split(week, byOutcome)} />
        </Plane>
      </Specimen>
      <Specimen label="More than four parts" note="Seven endpoints. Four parts are the most a reader tells apart, so the fourth drawn is Other: the sum of the fourth and every later one, in the columns, the legend, the readout and the table alike.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by endpoint" format={formatCompact} axisFormat={axis} dates={dates(week)} parts={endpoints} columns={split(week, byEndpoint)} />
        </Plane>
      </Specimen>
      <Specimen label="Highlighted" stack note="The one column the card is about. Plain, it is the accent column, as in Categories and Days. Stacked, every column is the accent already, so it wears the 2px ring in ink while no column is pointed at.">
        <State label="Highlighted, stacked" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, the busiest day highlighted" height={160} format={formatCompact} axisFormat={axis} highlight={week[4].date} dates={dates(week)} parts={regions} columns={split(week, byRegion)} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Running" stack note="running: the last column is a period not over yet, here today at 09:00 UTC. Its fill is at half strength inside a dashed outline, open at the baseline: the outline has a pixel of its own, so it covers no part, and it is what keeps the faded column a column. Read, the day says so far: in the plain value, the readout, the announcement and its row of the table.">
        <State label="Plain" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day, today so far" height={160} format={formatCompact} axisFormat={axis} running dates={dates(week)} columns={week.map((d) => ({ key: d.date, label: formatShortDate(d.date), value: soFar(d) }))} />
          </Plane>
        </State>
        <State label="Stacked" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, today so far" height={160} format={formatCompact} axisFormat={axis} running dates={dates(week)} parts={regions} columns={split(week, byRegion, soFar)} />
          </Plane>
        </State>
        <State label="Plain: the running day read" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day, with today read" height={160} format={formatCompact} axisFormat={axis} running data-preview-index={week.length - 1} dates={dates(week)} columns={week.map((d) => ({ key: d.date, label: formatShortDate(d.date), value: soFar(d) }))} />
          </Plane>
        </State>
        <State label="Stacked: the running day read" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with today read" format={formatCompact} axisFormat={axis} running data-preview-index={week.length - 1} dates={dates(week)} parts={regions} columns={split(week, byRegion, soFar)} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Values at rest" stack note="While a column is at least 36px wide its value stands above it in ink-3, in the 28px the plot keeps over its top tick. Narrower, the figures would collide, so a value shows only for the column pointed at. The values are exact counts: a format that rounded them to thousands would give three of these days one figure.">
        <State label="Five days: a column of 36px or more" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, last 5 days" height={160} axisFormat={axis} dates={dates(week.slice(-5))} columns={errors(week.slice(-5))} />
          </Plane>
        </State>
        <State label="Fourteen days in a narrow card: under 36px a column" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <ColumnChart label="Errors per day, last 14 days, in a narrow card" height={160} axisFormat={axis} dates={dates(fortnight)} columns={errors(fortnight)} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="More columns than room" stack note="A chart never grows past its card. The 2px between columns are kept while every column has a pixel of its own; with less room the gap is a pixel, then none, and only then do the columns go under a pixel. Past that the chart is a shape and no column is read: a Trend chart is the form for so many periods.">
        <State label="Ninety days in a narrow card: a pixel between columns" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <ColumnChart label="Errors per day, last 90 days, in a narrow card" height={160} axisFormat={axis} dates={dates(quarter)} columns={errors(quarter)} />
          </Plane>
        </State>
        <State label="A year of days in a narrow card: 360 columns, nothing between them" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <ColumnChart label="Errors per day, a year of days, in a narrow card" height={160} axisFormat={axis} dates={dates(year)} columns={errors(year)} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Zero" stack note="A column of zero draws nothing and reads zero. Stacked, a day whose parts are all zero draws no part and reads a total of zero, and a part at zero is absent from its column, with no line and no gap. The sample has no such day, so each is made here from the week.">
        <State label="Plain: a day with no errors" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, with a day of none" height={160} axisFormat={axis} dates={dates(week)} columns={noErrors} />
          </Plane>
        </State>
        <State label="Stacked: a day with no requests, and a day with none from one region" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with a day of none" height={160} format={formatCompact} axisFormat={axis} dates={dates(week)} parts={regions} columns={noRequests} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="No data" stack note="null: a period with no data keeps its slot on the axis and draws no column, only the empty track the height of the scale, and it reads No data, at rest, pointed at, in the announcement and in the table: never zero, which would say the rate was perfect that day. The scale is the periods that have data. Stacked, a column whose every part is null is no data; a part that is null reads No data and adds nothing to the total of the parts read. A running period with no data reads No data so far.">
        <State label="Plain: a day not read" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, with a day not read" height={160} axisFormat={axis} dates={dates(week)} columns={unread} />
          </Plane>
        </State>
        <State label="Stacked: a day not read from any region, and a day not read from one" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with days not read" height={160} format={formatCompact} axisFormat={axis} dates={dates(week)} parts={regions} columns={unreadParts} />
          </Plane>
        </State>
        <State label="Pointed at: the day not read" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, with the day not read pointed at" height={160} axisFormat={axis} data-preview-index={2} dates={dates(week)} columns={unread} />
          </Plane>
        </State>
        <State label="Stacked, pointed at: a region not read" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with a region not read pointed at" format={formatCompact} axisFormat={axis} data-preview-index={4} dates={dates(week)} parts={regions} columns={unreadParts} />
          </Plane>
        </State>
        <State label="Running: today with nothing yet" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, today with nothing yet" height={160} axisFormat={axis} running dates={dates(week)} columns={nothingYet} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Fill" note="height fill: the chart takes the height its card gives it, never under 220px. The card here is 384px tall; the legend and the labels keep their lines and the plot takes the rest.">
        <Plane on="surface" className="flex h-96 flex-col">
          <ColumnChart label="Requests per day by region, at its card's height" height="fill" format={formatCompact} axisFormat={axis} dates={dates(week)} parts={regions} columns={split(week, byRegion)} />
        </Plane>
      </Specimen>
      <Specimen label="Focus" note="The plot is the chart's one Tab stop. Focused from the keyboard it wears a 2px accent outline, 4px off its box. The box holds everything the plot draws, the tick labels and a column's value among them, so the ring touches none of it and stands clear of the labels under it; the arrow keys then move the cursor a column.">
        <State label="Focus" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, with the plot focused" height={160} axisFormat={axis} dates={dates(week)} columns={errors(week)} className={FOCUS} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="A column pointed at" stack note="By the pointer, or by the arrow keys on the focused plot. Stacked, the column takes a 2px ring in ink and the readout names the period, every part from the top down and the total. Plain, the column takes the accent and its value the tooltip's plane. Each is drawn statically here, through the Atlas-only index.">
        <State label="Stacked" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with one day read" format={formatCompact} axisFormat={axis} data-preview-index={4} dates={dates(week)} parts={regions} columns={split(week, byRegion)} />
          </Plane>
        </State>
        <State label="Plain, in columns too narrow for values at rest" still className="w-full">
          <Plane on="surface" className="max-w-2xl">
            <ColumnChart label="Errors per day, with one day read" height={160} axisFormat={axis} data-preview-index={21} dates={dates(month)} columns={errors(month)} />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

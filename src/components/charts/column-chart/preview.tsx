'use client';

import { Specimen, State, Plane } from '@/system/specimen';
import { DEMO_NOW, demoSeries, ENDPOINTS, REGIONS, STATUS_MIX, type DailyPoint } from '@/system/fixtures/sample';
import { formatCompact } from '@/lib/format';
import { formatDate } from '@/lib/format-date';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { ColumnChart, type ColumnPart, type StackedColumn } from '.';

const week = demoSeries('7d').current;
const fortnight = demoSeries('30d').current.slice(-14);
const month = demoSeries('30d').current;
const day = (date: string) => formatDate(date).replace(/ \d{4}$/, '');
const sum = (xs: { value: number }[]) => xs.reduce((a, x) => a + x.value, 0);

/** The sample keeps one split of its requests for the whole period, so a day's parts are the day's requests in those shares. */
const split = (days: DailyPoint[], shares: number[], requests = (d: DailyPoint) => d.requests): StackedColumn[] => {
  const whole = shares.reduce((a, b) => a + b, 0);
  return days.map((d) => ({ key: d.date, label: day(d.date), values: shares.map((s) => Math.round((requests(d) * s) / whole)) }));
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

export default function ColumnChartPreview() {
  return (
    <>
      <Specimen label="Categories" note="One column per category, the neutral population, one highlighted. A column of 36px or more keeps its value above it.">
        <Plane on="surface">
          <ColumnChart
            label="Requests by endpoint"
            format={formatCompact}
            highlight="/v1/messages"
            columns={ENDPOINTS.map((e) => ({ key: e.route, label: e.route.replace('/v1/', ''), value: e.requests }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="Days" note="Seven days of errors; today highlighted.">
        <Plane on="surface" className="max-w-lg">
          <ColumnChart
            label="Errors per day, last 7 days"
            height={160}
            format={formatCompact}
            highlight={week[week.length - 1].date}
            columns={week.map((d) => ({ key: d.date, label: day(d.date), value: d.errors }))}
          />
        </Plane>
      </Specimen>
      <Specimen label="On the Meridian" note="Given dates, the columns share the page's cursor: point at a column, or move through them with the arrow keys, and the trend above follows.">
        <Meridian dates={month.map((d) => d.date)}>
          <Plane on="surface" className="flex flex-col gap-6">
            <TrendChart label="Requests per day" dates={month.map((d) => d.date)} height={160} series={[{ key: 'r', label: 'Requests', values: month.map((d) => d.requests), kind: 'area' }]} />
            <ColumnChart
              label="Errors per day"
              height={120}
              format={formatCompact}
              dates={month.map((d) => d.date)}
              columns={month.map((d) => ({ key: d.date, label: day(d.date), value: d.errors }))}
            />
          </Plane>
        </Meridian>
      </Specimen>
      <Specimen label="Parts of a whole" note="parts: each column is a day's requests split by region, the first part at the bottom. The parts are one kind of thing, so they share the accent, deepest at the bottom and paler upward, with a hairline of the card where two touch. The axis and the value above a column are the total.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by region" format={formatCompact} parts={regions} columns={split(week, byRegion)} />
        </Plane>
      </Specimen>
      <Specimen label="Outcomes" note="A tone a part: the usual outcome is neutral, and one that needs somebody is warning or critical, named in the legend. The accent never stands beside a tone. A part that is not zero is at least 3px tall, so a day's server errors are never lost under its answers.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by how they were answered" format={formatCompact} parts={outcomes} columns={split(week, byOutcome)} />
        </Plane>
      </Specimen>
      <Specimen label="More than four parts" note="Seven endpoints. Four parts are the most a reader tells apart, so the fourth drawn is Other: the sum of the fourth and every later one, in the columns, the legend, the readout and the table alike.">
        <Plane on="surface">
          <ColumnChart label="Requests per day, by endpoint" format={formatCompact} parts={endpoints} columns={split(week, byEndpoint)} />
        </Plane>
      </Specimen>
      <Specimen label="Running" stack note="running: the last column is a period not over yet, here today at 09:00 UTC. It is drawn at half strength under a dashed cap, and its readout, its announcement and its row of the table say so far.">
        <State label="Plain" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day, today so far" height={160} format={formatCompact} running columns={week.map((d) => ({ key: d.date, label: day(d.date), value: soFar(d) }))} />
          </Plane>
        </State>
        <State label="Stacked" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, today so far" height={160} format={formatCompact} running parts={regions} columns={split(week, byRegion, soFar)} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Values at rest" stack note="While a column is at least 36px wide its value stands above it in ink-3, and the plot keeps 20px above its top tick for it. Narrower, the figures would collide, so a value shows only for the column pointed at.">
        <State label="Five days: a column of 36px or more" className="w-full">
          <Plane on="surface">
            <ColumnChart label="Errors per day, last 5 days" height={160} format={formatCompact} columns={week.slice(-5).map((d) => ({ key: d.date, label: day(d.date), value: d.errors }))} />
          </Plane>
        </State>
        <State label="Fourteen days in a narrow card: under 36px a column" className="w-full">
          <Plane on="surface" className="max-w-sm">
            <ColumnChart label="Errors per day, last 14 days, in a narrow card" height={160} format={formatCompact} columns={fortnight.map((d) => ({ key: d.date, label: day(d.date), value: d.errors }))} />
          </Plane>
        </State>
      </Specimen>
      <Specimen label="Fill" note="height fill: the chart takes the height its card gives it, never under 220px. The card here is 384px tall; the legend and the labels keep their lines and the plot takes the rest.">
        <Plane on="surface" className="flex h-96 flex-col">
          <ColumnChart label="Requests per day by region, at its card's height" height="fill" format={formatCompact} parts={regions} columns={split(week, byRegion)} />
        </Plane>
      </Specimen>
      <Specimen label="A column pointed at" stack note="By the pointer, or by the arrow keys on the focused plot. Stacked, the column takes a 2px ring in ink and the readout names the period, every part from the top down and the total. Plain, the column takes the accent and its value the tooltip's plane. Each is drawn statically here, through the Atlas-only index.">
        <State label="Stacked" still className="w-full">
          <Plane on="surface">
            <ColumnChart label="Requests per day by region, with one day read" format={formatCompact} data-preview-index={4} parts={regions} columns={split(week, byRegion)} />
          </Plane>
        </State>
        <State label="Plain, in columns too narrow for values at rest" still className="w-full">
          <Plane on="surface" className="max-w-2xl">
            <ColumnChart label="Errors per day, with one day read" height={160} format={formatCompact} data-preview-index={21} columns={month.map((d) => ({ key: d.date, label: day(d.date), value: d.errors }))} />
          </Plane>
        </State>
      </Specimen>
    </>
  );
}

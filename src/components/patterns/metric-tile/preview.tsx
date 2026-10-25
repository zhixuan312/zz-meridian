'use client';

import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CircleDollarSign, Gauge, Zap } from 'lucide-react';
import { CUSTOMERS, demoSeries } from '@/system/fixtures/company';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { formatDay } from '@/lib/format-date';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Specimen, State } from '@/system/specimen';
import { MetricTile } from '.';

const s = demoSeries('30d').current;
const dates = s.map((d) => d.date);
const peak = s.reduce((m, d) => (d.requests > m.requests ? d : m), s[0]);

/**
 * The sample's eight largest customers, as a wall draws them: what each paid in 30 days, its plan, and its last 14 days
 * of requests, the last 7 against the 7 before.
 */
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const figures = CUSTOMERS.slice(0, 8).map((c) => ({
  label: c.name,
  value: c.revenue,
  points: c.trend,
  delta: sum(c.trend.slice(7)) / sum(c.trend.slice(0, 7)) - 1,
  format: formatCost,
  compare: 'vs last week',
}));
/** The same eight for a compact tile, each with its plan as the note on its line. */
const customers = figures.map((f, i) => ({ ...f, note: CUSTOMERS[i].plan }));
const [first] = customers;

/** Points the shared cursor at one day, to show the reading state still. */
function PointAt({ i }: { i: number }) {
  const { setIndex } = useMeridian(dates);
  useEffect(() => setIndex(i), [setIndex, i]);
  return null;
}

/**
 * A wall as a page lays one out: two across, and four from 59rem of the wall's own width (826px), the first width at
 * which each of four tiles has the 14rem its change needs to stand beside its name.
 */
const Wall = ({ children }: { children: ReactNode }) => (
  <div className="@container w-full">
    <div className="grid grid-cols-2 gap-3 @min-[59rem]:grid-cols-4">{children}</div>
  </div>
);

/**
 * The card that holds a wall, as a page draws it. Its head says what the figure is, over which days and what the change
 * is against, once, so no tile repeats it.
 */
const Holder = ({ children }: { children: ReactNode }) => (
  <Card className="w-full">
    <CardHeader wrap title="Every customer, the last 14 days" description="What each paid in 30 days, and its plan. The change is its requests this week against last." />
    <CardBody>{children}</CardBody>
  </Card>
);

const compactWall = (
  <Wall>
    {customers.map((c) => <MetricTile key={c.label} size="compact" {...c} />)}
  </Wall>
);

export default function MetricTilePreview() {
  return (
    <>
      <Specimen label="Row of tiles" note="One tile per row may carry emphasis: its figure takes the accent ink and its sparkline the accent.">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Requests" hint="Every API call that reached the gateway." icon={<Zap />} value={2_943_120} delta={0.057} points={s.map((d) => d.requests)} format={formatCompact} emphasis />
          <MetricTile label="Error rate" hint="Share of requests answered with a 5xx or a 429." icon={<AlertTriangle />} value={0.009} delta={0.13} intent="down" points={s.map((d) => d.errors / d.requests)} format={(n) => formatPercent(n, 2)} />
          <MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={-0.014} intent="down" points={s.map((d) => d.p95)} format={formatDuration} />
          <MetricTile label="Revenue" icon={<CircleDollarSign />} value={298.43} delta={0.062} intent="neutral" points={s.map((d) => d.revenue)} format={formatCost} />
        </div>
      </Specimen>
      <Specimen label="Extreme values" note="The largest figures the formatters print, in the same row: an exact count in the billions, an enterprise month of revenue, a slow p95 and a change of several hundred per cent.">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Requests" icon={<Zap />} value={9_876_543_210} delta={4.37} points={s.map((d) => d.requests)} format="count" />
          <MetricTile label="Error rate" icon={<AlertTriangle />} value={1} delta={-0.999} intent="down" points={s.map((d) => d.errors / d.requests)} format={(n) => formatPercent(n, 2)} />
          <MetricTile label="Latency p95" icon={<Gauge />} value={3_725_000} delta={12.5} intent="down" points={s.map((d) => d.p95)} format={formatDuration} />
          <MetricTile label="Revenue" icon={<CircleDollarSign />} value={1_234_567.89} delta={0.062} intent="neutral" points={s.map((d) => d.revenue)} format={formatCost} />
        </div>
      </Specimen>
      <Specimen label="Variants">
        <State label="No sparkline" className="w-64"><MetricTile label="Active keys" value={14} delta={0} format={(n) => String(n)} /></State>
        <State label="Nothing to compare" className="w-64"><MetricTile label="Webhooks delivered" value={21_070} delta={null} format={formatCompact} /></State>
      </Specimen>
      <Specimen label="Reading a day" note="When the page's Meridian points at a day, every tile whose points are the page's reads that day and names it in place of the change.">
        <Meridian dates={dates}>
          <PointAt i={18} />
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <MetricTile label="Requests" icon={<Zap />} value={2_943_120} delta={0.057} points={s.map((d) => d.requests)} format={formatCompact} emphasis />
            <MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={-0.014} intent="down" points={s.map((d) => d.p95)} format={formatDuration} />
          </div>
        </Meridian>
      </Specimen>
      {/* The pointed day is the one figure a person came to check, so a day nothing was measured for says so rather than
          standing the period's total in its place. */}
      <Specimen label="Reading a day with no number" note="A day the tile has no measurement for reads as not measured, and names the day. It never falls back to the period's total, which would be a different day's answer.">
        <Meridian dates={dates}>
          <PointAt i={18} />
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <MetricTile label="Requests" icon={<Zap />} value={2_943_120} delta={0.057} points={s.map((d, i) => (i === 18 ? null : d.requests))} format={formatCompact} />
          </div>
        </Meridian>
      </Specimen>
      <Specimen label="Points that are not the page's" note="A tile reads the pointed point only when it has one point for each of the Meridian's dates. Here the page holds 30 days and points at one of them: the tile of 30 points reads it, and the tile of a customer's 14 keeps its period, its change and a Sparkline with no cursor.">
        <Meridian dates={dates}>
          <PointAt i={18} />
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <State label="30 points on a page of 30 days: reads the day" className="w-full"><MetricTile className="w-full" label="Revenue" icon={<CircleDollarSign />} value={298.43} delta={0.062} intent="neutral" points={s.map((d) => d.revenue)} format={formatCost} /></State>
            <State label="14 points on a page of 30 days: keeps its period" className="w-full"><MetricTile className="w-full" {...figures[0]} /></State>
          </div>
        </Meridian>
      </Specimen>
      <Specimen label="A finding's tone" note="finding: one line computed by code that the number does not say, the same one both agents read. Its tone is the caller's to say, and there is no default: neutral for a fact, beside a neutral dot; warning for one that needs a look, beside the warning dot.">
        <Meridian dates={dates}>
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <State label="A fact: the neutral dot" className="w-full"><MetricTile className="w-full" label="Requests" icon={<Zap />} value={2_943_120} delta={0.057} points={s.map((d) => d.requests)} finding={{ text: `The busiest day was ${formatDay(peak.date)}, with ${formatCompact(peak.requests)}`, day: peak.date, tone: 'neutral' }} format={formatCompact} /></State>
            <State label="Needs a look: the warning dot" className="w-full"><MetricTile className="w-full" label="Error rate" icon={<AlertTriangle />} value={0.009} delta={0.124} intent="down" points={s.map((d) => d.errors / d.requests)} baseline={0.0081} finding={{ text: '2.7× usual on 21 and 22 Sept', day: dates[18], tone: 'warning' }} format={(n) => formatPercent(n, 2)} /></State>
          </div>
        </Meridian>
      </Specimen>
      <Specimen label="A finding, and what is usual" note="With a day, a finding is a button that points the Meridian there; without one it is a plain line. baseline: the daily median, so a day being read says how it compares.">
        <Meridian dates={dates}>
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <State label="With a day: a button" className="w-full"><MetricTile className="w-full" label="Error rate" icon={<AlertTriangle />} value={0.009} delta={0.124} intent="down" points={s.map((d) => d.errors / d.requests)} baseline={0.0081} finding={{ text: '2.7× usual on 21 and 22 Sept', day: dates[18], tone: 'warning' }} format={(n) => formatPercent(n, 2)} /></State>
            <State label="No day: a plain line" className="w-full"><MetricTile className="w-full" label="Error rate" icon={<AlertTriangle />} value={0.009} delta={0.124} intent="down" points={s.map((d) => d.errors / d.requests)} baseline={0.0081} finding={{ text: '2.7× usual on 21 and 22 Sept', tone: 'warning' }} format={(n) => formatPercent(n, 2)} /></State>
          </div>
        </Meridian>
        <Meridian dates={dates}>
          <PointAt i={18} />
          <State label="Reading a day against usual" className="w-full sm:w-80"><MetricTile label="Latency p95" icon={<Gauge />} value={294} delta={0.014} intent="down" points={s.map((d) => d.p95)} baseline={296} format={formatDuration} /></State>
        </Meridian>
      </Specimen>
      <Specimen label="A word, not a number" note="A categorical state is a word set smaller than a figure; a named format (compact, cost-compact) lets a server page render the tile.">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <State label="Categorical value" className="w-full"><MetricTile className="w-full" label="Forecast" hint="Whether the trend points to a new customer segment." value="Likely new" note="Based on the last 14 days" /></State>
          <State label="Named format" className="w-full"><MetricTile className="w-full" label="Pipeline" hint="Open opportunities, in the workspace currency." value={1_240_000} format="cost-compact" delta={0.08} /></State>
          <State label="A note in a narrow tile takes a second line" className="w-56"><MetricTile className="w-full" label="Customers" value={320} note="296 active · 14 trials · 10 past due" /></State>
        </div>
      </Specimen>
      <Specimen wide label="Compact: a wall on a desk" note="size=compact, for a wall of many tiles: the name, the change's figure, one line that is the figure and then the note, and the Sparkline. The sample's eight largest customers, four across from 59rem of the wall's own width, so eight are two rows. The card's head says what the change is against, once: a tile draws the change and not the words." stack>
        <Holder>{compactWall}</Holder>
      </Specimen>
      <Specimen wide label="The same figures at the default size" note="The same eight customers as default tiles. A default tile gives the figure its size, says what its change is against and has no place for the plan beside it; eight of them are a page of their own, which is what the compact size is for." stack>
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {figures.map((f) => <MetricTile key={f.label} {...f} />)}
        </div>
      </Specimen>
      <Specimen label="Compact: a wall on a phone" note="The same wall in a card as wide as a phone's: two to a row, each tile about 150px. The name has the tile's whole width, the change stands under it at the same place in every tile, then the line. Beside it, the same figures at the default size in the same width." className="items-start">
        <State label="Compact: eight in four rows" className="w-full max-w-93">
          <Holder>{compactWall}</Holder>
        </State>
        <State label="Default: eight in eight rows" className="w-full max-w-93">
          <Holder>
            <div className="flex flex-col gap-3">
              {figures.map((f) => <MetricTile key={f.label} {...f} />)}
            </div>
          </Holder>
        </State>
      </Specimen>
      <Specimen label="Compact: its two layouts" note="The tile reads its own width. From 14rem (196px) the change stands at the right of the name's row and the line has the whole width under them. Narrower, the three are three rows: the name, the change, the line." className="items-start">
        <State label="288px: the change beside the name" className="w-72"><MetricTile className="w-full" size="compact" {...first} /></State>
        <State label="176px: three rows" className="w-44"><MetricTile className="w-full" size="compact" {...first} /></State>
      </Specimen>
      <Specimen label="Compact: states" note="What a compact tile draws when a part is missing or long. It never draws a hint, an icon, a finding or the words its change is against, and its line never reads the page's cursor." className="items-start">
        <State label="Emphasis: the figure and the shape in the accent" className="w-72"><MetricTile className="w-full" size="compact" {...first} emphasis /></State>
        <State label="A fall" className="w-72"><MetricTile className="w-full" size="compact" {...customers[1]} delta={-0.084} /></State>
        <State label="Nothing to compare: a dash" className="w-72"><MetricTile className="w-full" size="compact" {...customers[2]} delta={null} /></State>
        <State label="No change given" className="w-72"><MetricTile className="w-full" size="compact" {...customers[3]} delta={undefined} /></State>
        <State label="No points: no Sparkline" className="w-72"><MetricTile className="w-full" size="compact" {...customers[4]} points={undefined} /></State>
        <State label="No note: the figure alone" className="w-72"><MetricTile className="w-full" size="compact" {...figures[5]} /></State>
        <State label="A long name and a long note, cut with their whole text in the title" className="w-44"><MetricTile className="w-full" size="compact" {...customers[3]} label={`${customers[3].label} of North America`} note={`${customers[3].note}, billed yearly`} /></State>
        <State label="A word for the figure" className="w-72"><MetricTile className="w-full" size="compact" label={customers[6].label} value="On a trial" note={customers[6].note} points={customers[6].points} /></State>
      </Specimen>
      <Specimen label="Compact on the Meridian" note="The page points at a day. A compact tile keeps its own figure; its Sparkline follows the Sparkline's rule and marks the day only when its points are the page's." className="items-start">
        <Meridian dates={dates}>
          <PointAt i={18} />
          <State label="30 points on a page of 30 days: the shape marks the day, the line keeps the period" className="w-72"><MetricTile className="w-full" size="compact" label="Requests" value={2_943_120} delta={0.057} note="30 days" points={s.map((d) => d.requests)} format={formatCompact} /></State>
          <State label="14 points on a page of 30 days: no cursor" className="w-72"><MetricTile className="w-full" size="compact" {...first} /></State>
        </Meridian>
      </Specimen>
    </>
  );
}

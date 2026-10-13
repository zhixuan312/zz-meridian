'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { demoSeries, demoTotals } from '@/system/fixtures/sample';
import { formatCompact, formatCost, formatDuration, formatPercent } from '@/lib/format';
import { formatDay } from '@/lib/format-date';
import { Badge } from '@/components/ui/badge';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { ColumnChart } from '@/components/charts/column-chart';
import { TrendChart } from '@/components/charts/trend-chart';
import { Plane, Specimen, State } from '@/system/specimen';
import { FeaturedMetric, type FeaturedFigure } from '.';

const s = demoSeries('30d').current;
const dates = s.map((d) => d.date);
const total = s.reduce((a, d) => a + d.requests, 0);
const before = demoSeries('30d').previous;
const month = demoTotals('30d').current;

/** A fact counted from the same days as the figure: how many of them were above an average day of the period before. */
const usual = before.reduce((a, d) => a + d.requests, 0) / before.length;
const above = s.filter((d) => d.requests > usual).length;
const monthFinding = { text: `${above} of ${s.length} days above the average day of the 30 before` };

/**
 * The sample keeps days, so the specimens whose points are weeks add them up: every whole week of the last ninety
 * days, Monday first, named by its Monday. The week still running is left out, as a period in progress is from any total.
 */
const quarter = demoSeries('90d').current;
const monday = quarter.findIndex((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 1);
const weeks = Array.from({ length: Math.floor((quarter.length - monday) / 7) }, (_, w) => quarter.slice(monday + w * 7, monday + w * 7 + 7)).map((days) => ({
  date: days[0].date,
  requests: days.reduce((a, d) => a + d.requests, 0),
  errors: days.reduce((a, d) => a + d.errors, 0),
  spend: days.reduce((a, d) => a + d.spend, 0),
  p95: [...days.map((d) => d.p95)].sort((a, b) => a - b)[3],
}));
const weekDates = weeks.map((w) => w.date);
const last = weeks[weeks.length - 1];
const prior = weeks[weeks.length - 2];
const week = (date: string) => `Week of ${formatDay(date)}`;
const earlier = weeks.slice(0, -1);
const weekFinding = { text: `Above ${earlier.filter((w) => w.requests < last.requests).length} of the ${earlier.length} weeks before it` };

function PointAt({ i }: { i: number }) {
  const { setIndex } = useMeridian(dates);
  useEffect(() => setIndex(i), [setIndex, i]);
  return null;
}

const Chart = () => (
  <TrendChart height="fill" label="Requests per day" dates={dates} series={[{ key: 'r', label: 'Requests', values: s.map((d) => d.requests), kind: 'area' }]} />
);

/** A week a column, the latest highlighted: the featured chart when the points are periods. */
const Weeks = ({ label, value, format }: { label: string; value: (w: (typeof weeks)[number]) => number; format: (n: number) => string }) => (
  <ColumnChart height="fill" label={label} dates={weekDates} highlight={last.date} format={format} columns={weeks.map((w) => ({ key: w.date, label: formatDay(w.date), value: value(w) }))} />
);

const requestsByWeek: FeaturedFigure = {
  kicker: 'Requests · last week',
  value: last.requests,
  points: weeks.map((w) => w.requests),
  format: formatCompact,
  delta: last.requests / prior.requests - 1,
  compare: 'vs the week before',
  caption: <>About {formatCompact(Math.round(last.requests / 7))} a day.</>,
  finding: weekFinding,
};
const spendByWeek: FeaturedFigure = {
  kicker: 'Spend · last week',
  value: last.spend,
  points: weeks.map((w) => w.spend),
  format: formatCost,
  delta: last.spend / prior.spend - 1,
  intent: 'neutral',
  compare: 'vs the week before',
  caption: <>About {formatCost(last.spend / 7)} a day.</>,
};

/** Two measures of equal standing that are never added together: requests answered and what they cost, a week a point. */
const TwoFigures = ({ className, actions }: { className?: string; actions?: ReactNode }) => (
  <Meridian dates={weekDates}>
    <FeaturedMetric
      className={className}
      actions={actions}
      {...requestsByWeek}
      pointLabel={week}
      peer={{ ...spendByWeek, children: <Weeks label="Spend per week" value={(w) => w.spend} format={formatCost} /> }}
      foot={
        <>
          <dl>
            <div><dt>Error rate</dt><dd>{formatPercent(last.errors / last.requests, 2)}</dd></div>
            <div><dt>Latency p95</dt><dd>{formatDuration(last.p95)}</dd></div>
            <div><dt>Spend per 1K requests</dt><dd>{formatCost((last.spend / last.requests) * 1000)}</dd></div>
          </dl>
          <Link href="/requests" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">Every request <ArrowRight className="size-3.5" /></Link>
        </>
      }
    >
      <Weeks label="Requests per week" value={(w) => w.requests} format={formatCompact} />
    </FeaturedMetric>
  </Meridian>
);

export default function FeaturedMetricPreview() {
  return (
    <>
      <Specimen label="With its chart" note="The page's protagonist: one per page, carrying the accent's light. Point at the chart to read a day.">
        <Meridian dates={dates}>
          <FeaturedMetric
            className="h-130 w-full"
            kicker="Requests · last 30 days"
            value={total}
            points={s.map((d) => d.requests)}
            format={formatCompact}
            delta={0.057}
            caption="About 98K a day. The busiest day was 1 Oct, with 128K."
            actions={<Badge tone="accent" dot>Live</Badge>}
          >
            <Chart />
          </FeaturedMetric>
        </Meridian>
      </Specimen>
      <Specimen label="States">
        <State label="Reading a day" className="w-full max-w-110">
          <Meridian dates={dates}>
            <PointAt i={21} />
            <FeaturedMetric className="w-full" kicker="Requests · last 30 days" value={total} points={s.map((d) => d.requests)} format={formatCompact} delta={0.057} />
          </Meridian>
        </State>
        <State label="Extreme: billions" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Requests · last 30 days" value={9_876_543_210} format={formatCompact} delta={4.37} />
        </State>
        <State label="Extreme: an enterprise month of spend" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Spend · this month" value={1_234_567.89} format={formatCost} delta={-0.081} intent="down" />
        </State>
        <State label="Without a chart; a fall that is good" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Spend · this month" value={298.43} format={(n) => `$${n.toFixed(2)}`} delta={-0.081} intent="down" caption="Credits cover the rest until 1 Nov." />
        </State>
      </Specimen>
      <Specimen label="A finding" note="finding: one fact the figure does not say, under the change and the caption, beside a neutral dot. It is counted from the same data as the figure, and it stays while a day is read.">
        <State label="At rest" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Requests · last 30 days" value={total} format={formatCompact} delta={0.057} caption="About 98K a day. The busiest day was 1 Oct, with 128K." finding={monthFinding} />
        </State>
        <State label="No caption: the finding sits under the change" className="w-full max-w-110">
          <FeaturedMetric className="w-full" kicker="Requests · last 30 days" value={total} format={formatCompact} delta={0.057} finding={monthFinding} />
        </State>
      </Specimen>
      <Specimen label="A foot" note="foot: a band inside the lit surface, under the chart and divided from it by a hairline. A dl in it is the supporting figures, a label over each; the one link goes to the far end, and under them on a narrow card.">
        <FeaturedMetric
          className="min-h-130 w-full"
          kicker="Requests · last 30 days"
          value={total}
          format={formatCompact}
          delta={0.057}
          caption="About 98K a day. The busiest day was 1 Oct, with 128K."
          finding={monthFinding}
          foot={
            <>
              <dl>
                <div><dt>Error rate</dt><dd>{formatPercent(month.errorRate, 2)}</dd></div>
                <div><dt>Latency p95</dt><dd>{formatDuration(month.p95)}</dd></div>
                <div><dt>Spend</dt><dd>{formatCost(month.spend)}</dd></div>
              </dl>
              <Link href="/usage" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">All endpoints <ArrowRight className="size-3.5" /></Link>
            </>
          }
        >
          <Chart />
        </FeaturedMetric>
        <State label="Narrow: the link wraps under the figures" className="w-full max-w-110">
          <FeaturedMetric
            className="w-full"
            kicker="Requests · last 30 days"
            value={total}
            format={formatCompact}
            delta={0.057}
            foot={
              <>
                <dl>
                  <div><dt>Error rate</dt><dd>{formatPercent(month.errorRate, 2)}</dd></div>
                  <div><dt>Latency p95</dt><dd>{formatDuration(month.p95)}</dd></div>
                  <div><dt>Spend</dt><dd>{formatCost(month.spend)}</dd></div>
                </dl>
                <Link href="/usage" className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">All endpoints <ArrowRight className="size-3.5" /></Link>
              </>
            }
          />
        </State>
      </Specimen>
      <Specimen label="Points that are weeks" note="points need not be days. compare says what the change is against, in the caller's words, and pointLabel names the pointed point, here a week by its Monday. Without pointLabel the pill gives the date.">
        <State label="At rest: vs the week before" className="w-full max-w-110">
          <Meridian dates={weekDates}>
            <FeaturedMetric className="w-full" {...requestsByWeek} pointLabel={week} />
          </Meridian>
        </State>
        <State label="Reading a week" className="w-full max-w-110">
          <Meridian dates={weekDates} day={weekDates[weekDates.length - 3]}>
            <FeaturedMetric className="w-full" {...requestsByWeek} pointLabel={week} />
          </Meridian>
        </State>
      </Specimen>
      <Specimen label="Two figures" note="peer: two measures of equal standing, never added together, as two halves of the one lit surface: one edge, one glow, a hairline between. Each half has its own kicker, figure, change, caption, finding and chart; the foot and the actions are the card's, and the actions head it on a row of their own. From 42rem of the card's own width (588px) the halves stand side by side on shared lines.">
        <TwoFigures className="min-h-140 w-full" actions={<Badge tone="neutral">{weeks.length} weeks</Badge>} />
      </Specimen>
      <Specimen label="Two figures, narrow" note="Under 42rem of its own width the same card is one column: the first figure, a hairline, the second, each chart at least 220px tall. Nothing is cut.">
        <Plane className="max-w-110">
          <TwoFigures className="w-full" />
        </Plane>
      </Specimen>
    </>
  );
}

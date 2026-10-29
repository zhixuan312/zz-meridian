'use client';

import { Specimen, State } from '@/system/specimen';
import { demoSeries, CUSTOMERS } from '@/system/fixtures/company';
import { Meridian } from '@/components/charts/meridian';
import { Sparkline } from '.';

const { current } = demoSeries('30d');
const dates = current.map((d) => d.date);
/** The sample reads every day, so the gaps are made here: three days with no value, and the day the cursor stands on among them. */
const gaps = current.map((d, i) => ([8, 19, 20].includes(i) ? null : d.requests));
/** A count that changes in steps: a plan's seats over 14 days. */
const SEATS = [12, 12, 12, 14, 14, 14, 14, 18, 18, 18, 16, 16, 20, 20];

export default function SparklinePreview() {
  return (
    <>
      <Specimen label="Colours" note="Accent for the figure that carries the finding; neutral for every other; a categorical slot only when the line stands for a series drawn elsewhere in that colour.">
        <State label="Accent" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} /></div></State>
        <State label="Neutral" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.p95)} color="neutral" /></div></State>
        <State label="Slot 3, as in its chart" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.revenue)} color={3} /></div></State>
      </Specimen>
      <Specimen label="On the Meridian" note="When the page points at a day, a hairline and a dot mark it, on a line that has one value for each of the page's dates. Here the page holds 30 days and the cursor is fixed on day 20: the line of 30 values marks it, a line with no value on day 20 marks the day with the hairline alone, and a customer's 14 days draw no mark.">
        <Meridian dates={dates} day={dates[20]}>
          <State label="30 values on a page of 30 days: the day is marked" className="w-72"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} height={44} /></div></State>
          <State label="Day 20 with no value: the hairline alone" className="w-72"><div className="w-full"><Sparkline values={gaps} height={44} /></div></State>
          <State label="14 values on a page of 30 days: no mark" className="w-72"><div className="w-full"><Sparkline values={CUSTOMERS[0].trend} color="neutral" height={44} /></div></State>
        </Meridian>
      </Specimen>
      <Specimen label="A day with no value" note="null: a day that was not observed keeps its place on the x axis and breaks the line and its area there, as the Trend chart's does; it is never drawn as zero. The range is the numbers'. With fewer than two numbers nothing is drawn.">
        <State label="Three days with no value" className="w-56"><div className="w-full"><Sparkline values={gaps} /></div></State>
      </Specimen>
      <Specimen label="Curve" note="curve: monotone (the default) smooths the line; linear draws it straight between days; step holds each value level to the next day, for a quantity that changes in steps: a plan, a limit, a count of seats. The area takes the same path.">
        <State label="Step: seats on a plan" className="w-56"><div className="w-full"><Sparkline values={SEATS} curve="step" color="neutral" /></div></State>
        <State label="Linear" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} curve="linear" color="neutral" /></div></State>
      </Specimen>
      <Specimen label="A held scale" note="domain: lines side by side drawn against one range, so their heights compare. The range drawn is the domain itself; a value outside it widens the range to take it, and the title says so.">
        <State label="Inside 0 to 100: titled 0 to 100" className="w-56"><div className="w-full"><Sparkline values={[42, 55, 48, 61, 58, 66, 63]} domain={[0, 100]} color="neutral" /></div></State>
        <State label="Widened: 128 is outside 0 to 100" className="w-56"><div className="w-full"><Sparkline values={[42, 55, 48, 61, 128, 66, 63]} domain={[0, 100]} color="neutral" /></div></State>
      </Specimen>
      <Specimen label="In a table cell" note="24px tall, beside the number it qualifies, never instead of it." stack>
        {CUSTOMERS.slice(0, 4).map((c) => (
          <div key={c.name} className="flex items-center gap-4 border-b border-line pb-3 text-sm last:border-0">
            <span className="w-40 truncate">{c.name}</span>
            <span className="w-28"><Sparkline values={c.trend} color="neutral" height={24} /></span>
            <span className="t-num ml-auto font-medium">{c.requests.toLocaleString('en-US')}</span>
          </div>
        ))}
      </Specimen>
    </>
  );
}

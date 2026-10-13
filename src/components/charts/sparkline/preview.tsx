'use client';

import { Specimen, State } from '@/system/specimen';
import { demoSeries, CUSTOMERS } from '@/system/fixtures/company';
import { useEffect } from 'react';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { Sparkline } from '.';

const { current } = demoSeries('30d');

export default function SparklinePreview() {
  return (
    <>
      <Specimen label="Colours" note="Accent for the figure that carries the finding; neutral for every other; a categorical slot only when the line stands for a series drawn elsewhere in that colour.">
        <State label="Accent" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} /></div></State>
        <State label="Neutral" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.p95)} color="neutral" /></div></State>
        <State label="Slot 3, as in its chart" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.revenue)} color={3} /></div></State>
      </Specimen>
      <Specimen label="On the Meridian" note="When the page points at a day, a hairline and a dot mark it, on a line that has one value for each of the page's dates. Here the page holds 30 days and the cursor is fixed on day 20: the line of 30 values marks it, and a customer's 14 days draw no mark.">
        <Meridian dates={current.map((d) => d.date)}>
          <Fixed />
        </Meridian>
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

function Fixed() {
  const dates = current.map((d) => d.date);
  const { setIndex } = useMeridian(dates);
  useEffect(() => setIndex(20), [setIndex]);
  return (
    <>
      <State label="30 values on a page of 30 days: the day is marked" className="w-72"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} height={44} /></div></State>
      <State label="14 values on a page of 30 days: no mark" className="w-72"><div className="w-full"><Sparkline values={CUSTOMERS[0].trend} color="neutral" height={44} /></div></State>
    </>
  );
}

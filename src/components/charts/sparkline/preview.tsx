'use client';

import { Specimen, State } from '@/system/specimen';
import { demoSeries, CUSTOMER_ROWS } from '@/system/fixtures/relay';
import { useEffect } from 'react';
import { Meridian, useMeridian } from '@/components/charts/meridian';
import { Sparkline } from '.';

const { current } = demoSeries('30d');

export default function SparklinePreview() {
  return (
    <>
      <Specimen label="Colours" note="Accent for the figure that carries the finding; neutral for every other.">
        <State label="Accent" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.requests)} /></div></State>
        <State label="Neutral" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.p95)} color="neutral" /></div></State>
        <State label="Slot 3" className="w-56"><div className="w-full"><Sparkline values={current.map((d) => d.spend)} color={3} /></div></State>
      </Specimen>
      <Specimen label="On the Meridian" note="When the page points at a day, a hairline and a dot mark it. Here the cursor is fixed on day 20.">
        <Meridian dates={current.map((d) => d.date)}>
          <Fixed />
        </Meridian>
      </Specimen>
      <Specimen label="In a table cell" note="24px tall, beside the number it qualifies, never instead of it." stack>
        {CUSTOMER_ROWS.slice(0, 4).map((c) => (
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
  return <div className="w-72"><Sparkline values={current.map((d) => d.requests)} height={44} /></div>;
}

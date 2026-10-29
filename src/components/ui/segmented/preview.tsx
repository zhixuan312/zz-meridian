'use client';

import { BarChart3, LineChart, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Specimen, State } from '@/system/specimen';
import { Segmented } from '.';

export default function SegmentedPreview() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [view, setView] = useState<'chart' | 'bars' | 'table'>('chart');
  return (
    <>
      <Specimen label="Period" note="The thumb slides to the choice; the change is instant.">
        <Segmented label="Reporting period" value={period} onChange={setPeriod} options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: 'all', label: 'All' }]} />
      </Specimen>
      <Specimen label="With icons">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'chart', label: <><LineChart className="size-3.5" />Trend</> },
            { value: 'bars', label: <><BarChart3 className="size-3.5" />Bars</> },
            { value: 'table', label: <><Table2 className="size-3.5" />Table</> },
          ]}
        />
      </Specimen>
      <Specimen label="States" note="Drawn still: Day is the choice and holds the thumb; Week shows the hover and the focus ring.">
        <State label="Rest"><Still /></State>
        <State label="Hover" className="[&_button:last-of-type]:text-ink"><Still /></State>
        <State label="Focus" still className="[&_button:last-of-type]:outline-2 [&_button:last-of-type]:outline-offset-0 [&_button:last-of-type]:outline-accent"><Still /></State>
      </Specimen>
      <Specimen label="Sizes">
        <State label="Small"><Sized size="sm" /></State>
        <State label="Medium"><Sized size="md" /></State>
      </Specimen>
    </>
  );
}

/** One size, live: a press moves the choice, as it does on a page. */
function Sized({ size }: { size: 'sm' | 'md' }) {
  const [value, setValue] = useState('day');
  return <Segmented size={size} label={size === 'sm' ? 'Small' : 'Medium'} value={value} onChange={setValue} options={[{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} />;
}

/** One state, held: nothing a press does moves it. */
function Still() {
  return <Segmented label="Granularity" value="day" onChange={() => {}} options={[{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} />;
}

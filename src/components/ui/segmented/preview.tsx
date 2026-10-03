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
      <Specimen label="Sizes">
        <State label="Small"><Segmented size="sm" label="Small" value="day" onChange={() => {}} options={[{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} /></State>
        <State label="Medium"><Segmented label="Medium" value="day" onChange={() => {}} options={[{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} /></State>
      </Specimen>
    </>
  );
}

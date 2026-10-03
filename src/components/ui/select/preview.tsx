'use client';

import { Globe } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { Select } from '.';
import { Check } from 'lucide-react';

const REGIONS = [
  { value: 'us-east-1', label: 'us-east-1', description: 'N. Virginia' },
  { value: 'eu-west-1', label: 'eu-west-1', description: 'Ireland' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1', description: 'Singapore' },
  { value: 'us-west-2', label: 'us-west-2', description: 'Oregon', disabled: true },
];

export default function SelectPreview() {
  return (
    <>
      <Specimen label="Trigger" note="Looks like an Input; the chevron turns when open." stack>
        <div className="grid w-full max-w-160 gap-x-3 gap-y-4 sm:grid-cols-2">
          <State label="With a value"><Select aria-label="Region" defaultValue="eu-west-1" options={REGIONS} leading={<Globe />} /></State>
          <State label="Placeholder"><Select aria-label="Model" placeholder="Choose a model" options={[{ value: 'large', label: 'relay-large' }]} /></State>
          <State label="Invalid"><Select aria-label="Retention" invalid placeholder="Choose a retention period" options={[{ value: '30', label: '30 days' }]} /></State>
          <State label="Disabled"><Select aria-label="Plan" disabled defaultValue="scale" options={[{ value: 'scale', label: 'Scale' }]} /></State>
        </div>
      </Specimen>
      <Specimen label="Sizes" stack>
        <div className="grid w-full max-w-160 items-end gap-3 sm:grid-cols-3">
          <State label="Small"><Select size="sm" aria-label="Small" defaultValue="us-east-1" options={REGIONS} /></State>
          <State label="Medium"><Select aria-label="Medium" defaultValue="us-east-1" options={REGIONS} /></State>
          <State label="Large"><Select size="lg" aria-label="Large" defaultValue="us-east-1" options={REGIONS} /></State>
        </div>
      </Specimen>
      <Specimen label="Open list" note="Shown inline here; in use it floats over the page. The current choice is checked; a disabled option stays visible." stack>
        <div className="w-full max-w-72">
          <div className="flex h-(--control-md) items-center gap-2 rounded-md border border-accent bg-surface px-3 text-sm ring-3 ring-accent/22">
            <span className="flex-1">eu-west-1</span>
          </div>
          <div role="listbox" aria-label="Regions" className="mt-1.5 rounded-lg bg-surface-raised p-1 shadow-overlay">
            {REGIONS.map((r, i) => (
              <div
                key={r.value}
                role="option"
                aria-selected={r.value === 'eu-west-1'}
                aria-disabled={r.disabled}
                className={`relative flex min-h-8 flex-col justify-center rounded-sm py-1.5 pr-8 pl-2 text-sm ${i === 0 ? 'bg-fill-hover' : ''} ${r.disabled ? 'text-ink-disabled' : 'text-ink'}`}
              >
                {r.label}
                <span className="text-xs text-ink-3">{r.description}</span>
                {r.value === 'eu-west-1' ? <Check className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-accent" strokeWidth={2.25} /> : null}
              </div>
            ))}
          </div>
        </div>
      </Specimen>
    </>
  );
}

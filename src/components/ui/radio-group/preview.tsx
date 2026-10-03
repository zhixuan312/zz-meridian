'use client';

import { Specimen } from '@/system/specimen';
import { RadioGroup } from '.';

const RETENTION = [
  { value: '7', label: '7 days', description: 'Enough to debug last week.' },
  { value: '30', label: '30 days', description: 'Matches the billing period.' },
  { value: '90', label: '90 days', description: 'For audits. Costs $0.02 per million requests.' },
];

export default function RadioGroupPreview() {
  return (
    <>
      <Specimen label="List" note="Two to five options that each need a sentence." stack>
        <RadioGroup aria-label="Log retention" defaultValue="30" options={RETENTION} />
      </Specimen>
      <Specimen label="Cards" note="When the choice is the main decision of a form." stack>
        <RadioGroup
          aria-label="Plan"
          variant="cards"
          defaultValue="scale"
          className="w-full"
          options={[
            { value: 'starter', label: 'Starter', description: '100 rpm, community support.' },
            { value: 'scale', label: 'Scale', description: '2,000 rpm, a 99.9% uptime target.' },
            { value: 'enterprise', label: 'Enterprise', description: 'Custom limits, a named engineer.', disabled: true },
          ]}
        />
      </Specimen>
      <Specimen label="States" stack>
        <RadioGroup
          aria-label="States"
          defaultValue="on"
          options={[
            { value: 'off', label: 'Not chosen' },
            { value: 'on', label: 'Chosen' },
            { value: 'disabled', label: 'Not available on this plan', disabled: true },
          ]}
        />
      </Specimen>
    </>
  );
}

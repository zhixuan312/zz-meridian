'use client';

import { Specimen, State } from '@/system/specimen';
import { Checkbox } from '.';

export default function CheckboxPreview() {
  return (
    <>
      <Specimen label="With a label" stack>
        <Checkbox label="Email me when an incident opens" defaultChecked />
        <Checkbox label="Include request bodies in exports" description="Bodies can hold customer data; exports are kept for 7 days." />
        <Checkbox label="Retry failed webhooks" disabled />
      </Specimen>
      <Specimen label="States" note="The box is 16px; its hit area is 32px.">
        <State label="Off"><Checkbox aria-label="Off" /></State>
        <State label="Hover"><Checkbox aria-label="Hover" className="border-ink-3" /></State>
        <State label="On"><Checkbox aria-label="On" defaultChecked /></State>
        <State label="Some"><Checkbox aria-label="Some" checked="indeterminate" /></State>
        <State label="Focus" still><Checkbox aria-label="Focus" defaultChecked className="outline-2 outline-offset-2 outline-accent" /></State>
        <State label="Invalid"><Checkbox aria-label="Invalid" aria-invalid /></State>
        <State label="Disabled"><Checkbox aria-label="Disabled" disabled /></State>
        <State label="Disabled on"><Checkbox aria-label="Disabled on" disabled defaultChecked /></State>
      </Specimen>
    </>
  );
}

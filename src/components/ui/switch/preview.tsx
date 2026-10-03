'use client';

import { Specimen, State } from '@/system/specimen';
import { Switch } from '.';

export default function SwitchPreview() {
  return (
    <>
      <Specimen label="With a label" note="Takes effect when flipped; no Save button." stack>
        <div className="flex w-full max-w-120 flex-col divide-y divide-line rounded-lg border border-line bg-surface px-4">
          <Switch className="py-3.5" label="Incident emails" description="When a service you own degrades." defaultChecked />
          <Switch className="py-3.5" label="Weekly usage digest" description="Mondays at 09:00 UTC." />
          <Switch className="py-3.5" label="Two-person approval for key changes" description="Required on the Enterprise plan." disabled defaultChecked />
        </div>
      </Specimen>
      <Specimen label="States">
        <State label="Off"><Switch aria-label="Off" /></State>
        <State label="On"><Switch aria-label="On" defaultChecked /></State>
        <State label="Focus"><Switch aria-label="Focus" defaultChecked className="outline-2 outline-offset-2 outline-accent" /></State>
        <State label="Disabled"><Switch aria-label="Disabled" disabled /></State>
        <State label="Disabled on"><Switch aria-label="Disabled on" disabled defaultChecked /></State>
      </Specimen>
      <Specimen label="Sizes">
        <State label="Small"><Switch size="sm" aria-label="Small" defaultChecked /></State>
        <State label="Medium"><Switch aria-label="Medium" defaultChecked /></State>
      </Specimen>
    </>
  );
}

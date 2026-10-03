'use client';

import { Specimen, State } from '@/system/specimen';
import { Textarea } from '.';

export default function TextareaPreview() {
  return (
    <>
      <Specimen label="Default" note="Grows with its text up to ten rows." stack>
        <Textarea aria-label="Incident note" className="max-w-160" placeholder="What changed, and what should the next person on call know?" />
      </Specimen>
      <Specimen label="States" stack>
        <div className="grid w-full max-w-160 gap-x-3 gap-y-4 sm:grid-cols-2">
          <State label="Filled">
            <Textarea aria-label="Filled" rows={3} defaultValue={'Shifted eu-west-1 traffic to eu-central-1.\np95 back under 650ms.'} />
          </State>
          <State label="Invalid">
            <Textarea aria-label="Invalid" rows={3} invalid defaultValue={'{ "event": "request.failed", }'} />
          </State>
          <State label="Disabled">
            <Textarea aria-label="Disabled" rows={3} disabled defaultValue="Notes are locked while the incident is resolved." />
          </State>
        </div>
      </Specimen>
    </>
  );
}

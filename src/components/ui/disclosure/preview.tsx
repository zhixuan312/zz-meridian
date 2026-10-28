'use client';

import { Plane, Specimen, State } from '@/system/specimen';
import { Disclosure } from '.';

const READINGS = <p className="text-sm text-ink-2">Six readings between 09:00 and 09:30, each above the 800 ms p95 target.</p>;

export default function DisclosurePreview() {
  return (
    <>
      <Specimen label="States" note="Press the summary, or Enter or Space on it. The content opens at once; only the chevron turns.">
        <State label="Closed" className="w-64"><Disclosure summary="Evidence">{READINGS}</Disclosure></State>
        <State label="Open" className="w-64"><Disclosure summary="Evidence" defaultOpen>{READINGS}</Disclosure></State>
        <State label="Focus" className="w-64" still>
          <Disclosure summary="Evidence" className="[&>summary]:outline-2 [&>summary]:outline-offset-2 [&>summary]:outline-accent">{READINGS}</Disclosure>
        </State>
      </Specimen>
      <Specimen label="Long summary" note="The summary wraps under itself; the chevron stays on its first line.">
        <State label="Closed, wrapping" className="w-56">
          <Disclosure summary="How the cost per million tokens is computed from the gateway's billed usage">
            <p className="text-sm text-ink-2">Billed usage in dollars, divided by the tokens served in the same hour, times one million.</p>
          </Disclosure>
        </State>
      </Specimen>
      <Specimen label="Inside a card">
        <Plane on="surface" className="max-w-md">
          <p className="t-card">p95 latency, eu-west</p>
          <p className="mt-1 text-sm text-ink-2">912 ms, above the 800 ms target for 30 minutes.</p>
          <Disclosure summary="Evidence" defaultOpen className="mt-4 border-t border-line pt-3">{READINGS}</Disclosure>
        </Plane>
      </Specimen>
    </>
  );
}

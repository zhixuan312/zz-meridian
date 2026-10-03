'use client';

import { Specimen, State } from '@/system/specimen';
import { Avatar } from '@/components/ui/avatar';
import { AgentMark } from '.';

export default function AgentMarkPreview() {
  return (
    <>
      <Specimen label="Sizes" note="20, 24 and 32px. Square, because agents are not people: a round mark is always a person.">
        <State label="sm"><AgentMark size="sm" /></State>
        <State label="md"><AgentMark /></State>
        <State label="lg"><AgentMark size="lg" /></State>
      </Specimen>
      <Specimen label="Person and agent" note="Side by side, the shape tells them apart before the words do.">
        <span className="flex items-center gap-3"><Avatar name="Jonas Weber" size="sm" /><AgentMark /></span>
      </Specimen>
      <Specimen label="In an activity line" note="An agent's change names the agent and the person it acted for." stack>
        <p className="flex items-center gap-3 text-sm text-ink-2">
          <AgentMark />
          <span><span className="font-medium text-ink">Claude</span> raised the rate limit for <span className="text-ink">Parallax AI to 2,000 rpm</span><span className="text-ink-3"> · for Jonas Weber</span></span>
        </p>
        <p className="flex items-center gap-3 text-sm text-ink-2">
          <Avatar name="Maya Chen" size="sm" />
          <span><span className="font-medium text-ink">Maya Chen</span> rotated <span className="text-ink">the production signing key</span></span>
        </p>
      </Specimen>
    </>
  );
}

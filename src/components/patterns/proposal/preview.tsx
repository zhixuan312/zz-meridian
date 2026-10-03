'use client';

import { Specimen, State } from '@/system/specimen';
import { Proposal, type ProposalState } from '.';

const base = {
  title: 'Raise the rate limit for Parallax AI',
  reason: 'Parallax AI hit its limit 1,284 times in the last hour, all from their batch job between 08:00 and 08:40 UTC. Their contract allows 2,000 requests a minute.',
  changes: [
    { label: 'Rate limit', from: '1,200 rpm', to: '2,000 rpm' },
    { label: 'Burst', from: '200', to: '320' },
  ],
  impact: 'Applies to all 14 API keys of Parallax AI. Other customers are not affected.',
};

export default function ProposalPreview() {
  const states: ProposalState[] = ['applying', 'applied', 'dismissed', 'failed'];
  const removal = {
    title: 'Remove Alice Moreno',
    changes: [{ label: 'Alice Moreno', from: 'Members', to: 'Removed' }],
  };
  return (
    <>
      <Specimen label="Waiting for you" note="An agent read, reasoned and proposed. Nothing changes until a person approves. Approve runs it once.">
        <Proposal {...base} className="w-full max-w-140" onApprove={() => new Promise((r) => setTimeout(r, 900))} />
      </Specimen>
      <Specimen label="Critical" note="A removal, with no reason line: the approve button is danger and says what it does.">
        <Proposal {...removal} tone="critical" className="w-full max-w-140" onApprove={() => new Promise((r) => setTimeout(r, 900))} />
      </Specimen>
      <Specimen label="States" stack note="Controlled by the caller, only Waiting shows buttons. Failed and Expired are the two that explain themselves.">
        {states.map((s) => (
          <State key={s} label={s[0].toUpperCase() + s.slice(1)} className="w-full max-w-140">
            <Proposal {...base} state={s} className="w-full" />
          </State>
        ))}
        <State label="Expired" className="w-full max-w-140">
          <Proposal {...removal} tone="critical" state="expired" note="The page was reloaded before anyone approved it." className="w-full" />
        </State>
      </Specimen>
    </>
  );
}

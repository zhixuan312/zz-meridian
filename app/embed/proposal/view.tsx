'use client';

import { useState } from 'react';
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Proposal, type ProposalState } from '@/components/patterns/proposal';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function EmbedProposal() {
  const { share, callTool } = useSurface();
  const [state, setState] = useState<ProposalState>('pending');
  useShareView(
    state === 'applied'
      ? "The person approved the proposal: Parallax AI's rate limit is now 2,000 requests per minute, effective immediately."
      : state === 'dismissed'
        ? "The person dismissed the proposal to raise Parallax AI's rate limit. Nothing changed."
        : "A proposal is waiting for the person: raise Parallax AI's rate limit from 1,000 to 2,000 requests per minute.",
    { view: 'proposal', proposal: 'raise_rate_limit', customer: 'Parallax AI', from: 1000, to: 2000, state },
  );
  return (
    <EmbedFrame title="Proposal" consolePath="/customers" expandable={false}>
      <Proposal
        title="Raise Parallax AI's rate limit"
        reason={<>429 responses for Parallax AI rose 14% in the last 24 hours, all at the 1,000 rpm limit. Their contract allows up to 2,500 rpm, and their p95 is steady.</>}
        changes={[
          { label: 'Rate limit', from: '1,000 rpm', to: '2,000 rpm' },
          { label: 'Burst', from: '1,500 rpm', to: '3,000 rpm' },
        ]}
        impact="Applies to all 14 of Parallax AI's API keys within a minute. Logged in Activity as approved by you."
        state={state === 'applied' || state === 'dismissed' ? state : undefined}
        onApprove={async () => {
          // Connected: the product's own tool applies the change, through the host. Standalone: a simulated delay.
          if (callTool) await callTool('relay_set_rate_limit', { customer: 'parallax-ai', rpm: 2000, burst: 3000 });
          else await wait(900);
          setState('applied');
          share("Approved: Parallax AI's rate limit is now 2,000 rpm.", { applied: true });
        }}
        onDismiss={() => setState('dismissed')}
      />
    </EmbedFrame>
  );
}

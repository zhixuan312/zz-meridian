'use client';

import { useState } from 'react';
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Proposal, type ProposalState } from '@/components/patterns/proposal';
import { toolPrefix } from '@/app.config';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function EmbedProposal() {
  const { share, callTool } = useSurface();
  const [state, setState] = useState<ProposalState>('pending');
  useShareView(
    state === 'applied'
      ? "The person approved the proposal: Northwind Labs' rate limit is now 2,400 requests per minute, effective immediately."
      : state === 'dismissed'
        ? "The person dismissed the proposal to raise Northwind Labs' rate limit. Nothing changed."
        : "A proposal is waiting for the person: raise Northwind Labs' rate limit from 1,200 to 2,400 requests per minute.",
    { view: 'proposal', proposal: 'raise_rate_limit', customer: 'Northwind Labs', from: 1200, to: 2400, state },
  );
  return (
    <EmbedFrame title="Proposal" consolePath="/customers" expandable={false}>
      <Proposal
        title="Raise Northwind Labs' rate limit"
        reason={<>429 responses for Northwind Labs rose 14% in the last 24 hours, all at the 1,200 rpm limit. Their contract allows up to 3,000 rpm, and their p95 is steady.</>}
        changes={[
          { label: 'Rate limit', from: '1,200 rpm', to: '2,400 rpm' },
          { label: 'Burst', from: '1,800 rpm', to: '3,600 rpm' },
        ]}
        impact="Applies to all 9 of Northwind Labs' API keys within a minute. Logged in Activity as approved by you."
        state={state === 'applied' || state === 'dismissed' ? state : undefined}
        onApprove={async () => {
          // Connected: the product's own tool applies the change, through the host. Standalone: a simulated delay.
          if (callTool) await callTool(`${toolPrefix}_set_rate_limit`, { customer: 'northwind-labs', rpm: 2400, burst: 3600 });
          else await wait(900);
          setState('applied');
          share("Approved: Northwind Labs' rate limit is now 2,400 rpm.", { applied: true });
        }}
        onDismiss={() => setState('dismissed')}
      />
    </EmbedFrame>
  );
}

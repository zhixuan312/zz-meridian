'use client';

import { useState } from 'react';
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Proposal, type ProposalState } from '@/components/patterns/proposal';
import { toolPrefix } from '@/app.config';
import type { SharedContext } from '@/lib/shared-context';

const CHANGES = [
  { label: 'Rate limit', from: '1,200 rpm', to: '2,400 rpm' },
  { label: 'Burst', from: '1,800 rpm', to: '3,600 rpm' },
];
const REASON = "429 responses for Northwind Labs rose 14% in the last 24 hours, all at the 1,200 rpm limit. Their contract allows up to 3,000 rpm, and their p95 is steady.";
const IMPACT = "Applies to all 9 of Northwind Labs' API keys within a minute. Logged in Activity as approved by you.";

/** The whole state of the proposal, every time: a host keeps only the latest context, so an outcome never travels alone. */
function proposalContext(state: ProposalState): SharedContext {
  const outcome = state === 'applied' ? 'this proposal, which they approved: the change is applied.' : state === 'dismissed' ? 'this proposal, which they dismissed: nothing changed.' : 'this proposal, which waits for them to approve or dismiss it.';
  return {
    view: 'proposal',
    title: 'Proposal',
    address: '/customers',
    scope: "raise Northwind Labs' rate limit",
    focus: outcome,
    facts: CHANGES.map((c) => ({ label: c.label, value: state === 'applied' ? c.to : c.from, change: state === 'applied' ? `was ${c.from}` : `proposed ${c.to}` })),
    insights: [{ text: `Why it was proposed: ${REASON}` }, { text: `What else it touches: ${IMPACT}` }],
    unknowns: [],
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function EmbedProposal() {
  const { callTool } = useSurface();
  const [state, setState] = useState<ProposalState>('pending');
  useShareView(proposalContext(state));
  return (
    <EmbedFrame title="Proposal" consolePath="/customers" expandable={false}>
      <Proposal
        title="Raise Northwind Labs' rate limit"
        reason={REASON}
        changes={CHANGES}
        impact={IMPACT}
        state={state === 'applied' || state === 'dismissed' ? state : undefined}
        onApprove={async () => {
          // Connected: the product's own tool applies the change, through the host. Standalone: a simulated delay.
          if (callTool) await callTool(`${toolPrefix}_set_rate_limit`, { customer: 'northwind-labs', rpm: 2400, burst: 3600 });
          else await wait(900);
          setState('applied');
        }}
        onDismiss={() => setState('dismissed')}
      />
    </EmbedFrame>
  );
}

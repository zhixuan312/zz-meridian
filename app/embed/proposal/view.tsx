'use client';

import { useState, useSyncExternalStore } from 'react';
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
  const outcome =
    state === 'applied' ? 'this proposal, which they approved: the change is applied.'
    : state === 'dismissed' ? 'this proposal, which they dismissed: nothing changed.'
    : state === 'failed' ? 'this proposal, which could not be applied: nothing changed.'
    : state === 'applying' ? 'this proposal, which they approved and which is being applied.'
    : state === 'expired' ? 'this proposal, which expired: nothing changed.'
    : 'this proposal, which waits for them to approve or dismiss it.';
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
/**
 * A terminal outcome survives the host remounting the view, so an applied proposal does not come back "Needs you" and
 * run twice. It lives on `window`, not in session storage: a remount keeps the window, a reload does not — and a reload
 * must start from "Needs you" again, or the press walk lists Approve and then cannot find it, and the stored state would
 * change the first client render against the server's.
 */
const OUTCOME_KEY = '__zzMeridianProposalRateLimit';
/** The document's kept outcome, as an external store: a remount subscribes again, a reload starts from "pending". */
const listeners = new Set<() => void>();
const kept = (): ProposalState => {
  try {
    const held = (window as unknown as Record<string, unknown>)[OUTCOME_KEY];
    return held === 'applied' || held === 'dismissed' || held === 'failed' ? held : 'pending';
  } catch { return 'pending'; }
};
const keep = (next: ProposalState) => {
  try { (window as unknown as Record<string, unknown>)[OUTCOME_KEY] = next; } catch { /* no window: this document only */ }
  for (const l of listeners) l();
};

export function EmbedProposal() {
  const { callTool } = useSurface();
  // `applying` is this mount's alone; a terminal outcome is the document's. The server snapshot is "pending", so the
  // first client render agrees with the server's and React reads the kept outcome on the next one.
  const [applying, setApplying] = useState(false);
  const keptState = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, kept, () => 'pending' as ProposalState);
  const state: ProposalState = applying ? 'applying' : keptState;
  const settle = (next: ProposalState) => {
    setApplying(next === 'applying');
    if (next !== 'applying') keep(next);
  };
  useShareView(proposalContext(state));
  return (
    <EmbedFrame title="Proposal" consolePath="/customers" expandable={false}>
      <Proposal
        title="Raise Northwind Labs' rate limit"
        reason={REASON}
        changes={CHANGES}
        impact={IMPACT}
        // The view owns every state: the card left uncontrolled would mark itself applied once `onApprove` returned,
        // and it returns after catching a refusal.
        state={state}
        onApprove={async () => {
          settle('applying');
          try {
            // Connected: the product's own tool applies the change, through the host. Standalone: a simulated delay.
            // An MCP tool answers a refusal in its result rather than by throwing, so `isError` is read as one: the
            // card said "applied" for a tool that refused, and the model was told the same.
            if (callTool) {
              const result = await callTool(`${toolPrefix}_set_rate_limit`, { customer: 'northwind-labs', rpm: 2400, burst: 3600 });
              if ((result as { isError?: boolean } | null)?.isError) throw new Error('refused');
            } else await wait(900);
            settle('applied');
          } catch {
            settle('failed');
          }
        }}
        onDismiss={() => settle('dismissed')}
      />
    </EmbedFrame>
  );
}

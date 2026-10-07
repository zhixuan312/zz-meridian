import { EmbedProposal } from './view';

export const metadata = { title: 'Proposal' };

/**
 * Tool: `zz_meridian_propose_rate_limit { customer, rpm }`. An agent never changes a setting itself: this tool returns the
 * change as a Proposal, and only a person's Approve applies it: the view calls `zz_meridian_set_rate_limit`, an apply tool the
 * server registers with `_meta.ui.visibility: ["app"]`, so the model never has it (`docs/agents.md`).
 */
export default function Page() {
  return <EmbedProposal />;
}

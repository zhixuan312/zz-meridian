import { EmbedProposal } from './view';

export const metadata = { title: 'Proposal' };

/**
 * Tool: `zz_meridian_propose_rate_limit { customer, rpm }`. An agent never changes a setting itself: this tool returns the
 * change as a Proposal, and only a person's Approve applies it.
 */
export default function Page() {
  return <EmbedProposal />;
}

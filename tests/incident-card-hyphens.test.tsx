import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IncidentCard, type Incident } from '@/components/patterns/incident-card';

const now = new Date('2026-10-03T09:00:00Z');
const INVESTIGATING = 'p95 latency above 900ms for requests routed through eu-west-1. Investigating.';
const open: Incident = {
  id: 'inc_2610',
  title: 'Elevated latency on Inference API in eu-west-1',
  service: 'Inference API',
  severity: 'minor',
  state: 'monitoring',
  started: '2026-10-03T06:00:00Z',
  updates: [
    { at: '2026-10-03T06:00:00Z', text: INVESTIGATING },
    { at: '2026-10-03T06:42:00Z', text: 'Traffic shifted to the other region. Latency is recovering.' },
  ],
};
const updates = (c: HTMLElement) => [...c.querySelectorAll('ol[aria-label="Updates"] li p')];

describe('an incident card preserves hyphenated content', () => {

  it('keeps the update\'s words as they were written, with a real hyphen', () => {
    const { container } = render(<IncidentCard incident={open} now={now} />);
    expect(updates(container).map((p) => p.textContent)).toEqual(['Traffic shifted to the other region. Latency is recovering.', INVESTIGATING]);
  });


  it('keeps a long hyphenated path intact', () => {
    const path = 'inference-gateway-eu-west-1-canary-pool-b';
    const { container } = render(<IncidentCard incident={{ ...open, updates: [{ at: open.started, text: `Rolled back ${path}.` }] }} now={now} />);
    expect(updates(container)[0]).toHaveTextContent(`Rolled back ${path}.`);
  });

  it('names a ticket link by its whole hyphenated title', () => {
    const ticket = { title: 'Inference API p95 above target in eu-west-1', href: '/operations-tickets?q=p95+above+target' };
    render(<IncidentCard incident={{ ...open, ticket }} now={now} />);
    const link = screen.getByRole('link', { name: ticket.title });
    expect(link).toHaveTextContent(ticket.title);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IncidentCard, type Incident } from '@/components/patterns/incident-card';

const now = new Date('2026-10-03T09:00:00Z');
const open: Incident = {
  id: 'inc_2610',
  title: 'Elevated latency on Inference API in eu-west-1',
  service: 'Inference API',
  severity: 'minor',
  state: 'monitoring',
  started: '2026-10-03T06:00:00Z',
  updates: [
    { at: '2026-10-03T06:00:00Z', text: 'p95 latency above 900ms. Investigating.' },
    { at: '2026-10-03T06:42:00Z', text: 'Traffic shifted to eu-central-1.' },
    { at: '2026-10-03T08:36:00Z', text: 'p95 back under 650ms. Monitoring.' },
  ],
};
const times = (c: HTMLElement) => [...c.querySelectorAll('ol[aria-label="Updates"] time')];

describe('an incident card: when each update came', () => {
  it('times each update from the incident\'s start, in the product\'s durations, the newest first', () => {
    const { container } = render(<IncidentCard incident={open} now={now} />);
    expect(times(container).map((t) => t.textContent)).toEqual(['after 2.6h', 'after 42m', 'at the start']);
    expect(times(container).map((t) => t.getAttribute('datetime'))).toEqual(['2026-10-03T08:36:00Z', '2026-10-03T06:42:00Z', '2026-10-03T06:00:00Z']);
  });

  it('says how long after the start a first update came, when it did not come at the start', () => {
    const late = { ...open, updates: [{ at: '2026-10-03T06:04:00Z', text: 'Investigating.' }, open.updates[1]] };
    const { container } = render(<IncidentCard incident={late} now={now} />);
    expect(times(container).map((t) => t.textContent)).toEqual(['after 42m', 'after 4m']);
  });
});

describe('an incident card: who has it, and where it is tracked', () => {
  it('names the owner and links the ticket when the incident has them', () => {
    const { container } = render(<IncidentCard incident={{ ...open, owner: 'Priya Nair', ticket: { title: 'Move eu-west-1 inference to the new pool', href: '/operations-tickets?open=tkt_118' } }} now={now} />);
    expect(container.querySelector('[data-owner]')).toHaveTextContent('Priya Nair');
    expect(screen.getByRole('link', { name: /Move eu-west-1 inference to the new pool/ })).toHaveAttribute('href', '/operations-tickets?open=tkt_118');
  });

  it('names neither when the incident has neither', () => {
    const { container } = render(<IncidentCard incident={open} now={now} />);
    expect(container.querySelector('[data-owner]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('draws the row for a list without the owner or the ticket', () => {
    const { container } = render(<IncidentCard incident={{ ...open, owner: 'Priya Nair', ticket: { title: 'Move eu-west-1 inference to the new pool', href: '/operations-tickets?open=tkt_118' } }} now={now} variant="row" />);
    expect(container.querySelector('[data-owner]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('time')).toHaveTextContent(/03 Oct 2026/);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeed, type ActivityEvent } from '@/components/patterns/activity-feed';

const now = new Date('2026-10-19T12:00:00Z');
const events: ActivityEvent[] = [
  { id: '1', at: '2026-10-19T11:00:00Z', actor: 'Ada Lovelace', verb: 'resolved', object: 'Login loops on Safari', href: '/bugs/b-12' },
  { id: '2', at: '2026-10-19T10:00:00Z', actor: 'Grace Hopper', verb: 'renamed the workspace to', object: 'Northwind' },
];

describe('an activity feed event about a record (#63)', () => {
  it('links its object to the record, with the arrow that says it stays in the product', () => {
    render(<ActivityFeed events={events} now={now} />);
    const link = screen.getByRole('link', { name: 'Login loops on Safari' });
    expect(link).toHaveAttribute('href', '/bugs/b-12');
    expect(link.querySelector('svg')).not.toBeNull();
  });
  it('keeps an object without a record as text', () => {
    render(<ActivityFeed events={events} now={now} />);
    expect(screen.queryByRole('link', { name: 'Northwind' })).toBeNull();
    expect(screen.getByText('Northwind')).toBeInTheDocument();
  });
});

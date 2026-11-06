import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShellTools, type Alert } from '@/components/patterns/shell-tools';

// A bell whose two kinds of alert mean different things drew one flat list under one count: interleaved by time, a
// failing check read with the weight of an incident (#123).
const now = new Date('2026-10-01T10:30:00.000Z');
const alerts: Alert[] = [
  { id: 'i1', title: 'Inference API degraded', at: '2026-10-01T10:00:00.000Z', href: '/services', tone: 'warning', unread: true, group: 'Incidents' },
  { id: 'v1', title: '3 verifications failing', at: '2026-10-01T09:30:00.000Z', href: '/tests', tone: 'critical', unread: true, group: 'Verifications' },
  { id: 'i2', title: 'Embed served slowly', at: '2026-10-01T09:00:00.000Z', href: '/services', tone: 'warning', group: 'Incidents' },
];

afterEach(() => sessionStorage.clear());

const open = () => {
  render(<ShellTools alerts={alerts} now={now} />);
  fireEvent.click(screen.getByRole('button', { name: /^Alerts/ }));
};

describe('alerts of different kinds', () => {
  it('draw one section per kind, each with its own heading and unread count', () => {
    open();
    const groups = screen.getAllByRole('region');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Incidents', 'Verifications']);
    // Incidents first because its first alert is the newest, and its second alert stands under the same heading.
    expect(within(groups[0]).getAllByRole('link')).toHaveLength(2);
    expect(within(groups[0]).getByText('1 new')).toBeTruthy();
    expect(within(groups[1]).getAllByRole('link')).toHaveLength(1);
    expect(within(groups[1]).getByText('1 new')).toBeTruthy();
  });

  it('states no heading for an alert that names no kind, and keeps it in the panel', () => {
    render(<ShellTools alerts={[{ id: 'x', title: 'Something else', at: '2026-10-01T09:00:00.000Z', href: '/', tone: 'neutral' }]} now={now} />);
    fireEvent.click(screen.getByRole('button', { name: /^Alerts/ }));
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    expect(screen.getByRole('link', { name: /Something else/ })).toBeTruthy();
  });

  it('keeps the bell’s own count as the total across the kinds, and Mark all read across them too', () => {
    open();
    expect(screen.getByRole('button', { name: /^Alerts/ })).toHaveAttribute('aria-label', 'Alerts, 2 new');
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(screen.getByRole('button', { name: /^Alerts/ })).toHaveAttribute('aria-label', 'Alerts');
    for (const group of screen.getAllByRole('region')) expect(within(group).queryByText(/new$/)).toBeNull();
  });
});

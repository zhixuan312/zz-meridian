import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push() {}, replace() {}, refresh() {}, prefetch() {} }) }));
import { ShellTools, type Alert } from '@/components/patterns/shell-tools';

const ALERTS: Alert[] = [
  { id: 'inc-1', title: 'Inference API degraded', at: '2026-10-01T10:00:00.000Z', href: '/services', tone: 'critical', unread: true },
  { id: 'due-1', title: 'Northwind Labs is past due', at: '2026-10-01T09:00:00.000Z', href: '/customers', tone: 'warning', unread: true },
];
const now = new Date('2026-10-01T10:30:00.000Z');
const bell = () => screen.getByRole('button', { name: /^Alerts/ });

afterEach(() => sessionStorage.clear());

describe('an alert the person opened', () => {
  it('stays read after a reload, in the same tab', async () => {
    const first = render(<ShellTools alerts={ALERTS} now={now} />);
    expect(bell().getAttribute('aria-label')).toBe('Alerts, 2 new');
    fireEvent.click(bell());
    fireEvent.click(screen.getByRole('link', { name: /Inference API degraded/ }));
    expect(bell().getAttribute('aria-label')).toBe('Alerts, 1 new');
    first.unmount();
    await act(async () => { render(<ShellTools alerts={ALERTS} now={now} />); });
    expect(bell().getAttribute('aria-label')).toBe('Alerts, 1 new');
  });

  it('draws every alert as new when storage cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await act(async () => { render(<ShellTools alerts={ALERTS} now={now} />); });
    expect(bell().getAttribute('aria-label')).toBe('Alerts, 2 new');
    vi.restoreAllMocks();
  });
});

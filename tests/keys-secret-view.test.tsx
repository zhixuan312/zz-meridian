import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string }[]);
vi.mock('@/components/ui/toast', () => ({ toast: (t: { tone: string; title: string }) => { toasts.push(t); } }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { KeysView } from '@/views/keys';
import { API_KEYS } from '@/system/fixtures/sample-records';

describe('the key list', () => {
  it('shows each key by its hint and never carries or reveals a full secret', () => {
    const { container } = render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => { throw new Error('unused'); }} revokeKey={async () => {}} />);
    expect(screen.getAllByText('zzm_live_…f601').length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toMatch(/zzm_(live|test)_[0-9a-f]{32}/);
    expect(screen.queryByRole('button', { name: /^Reveal/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Copy .* key$/ })).toBeNull();
  });
});

describe('creating a key', () => {
  it('says why it failed inside the open sheet, not in a toast over it', async () => {
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => { throw new Error('You do not have permission to create keys.'); }} revokeKey={async () => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]);
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Billing worker' } });
    const before = toasts.length;
    await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create key' })); });
    const alert = within(await screen.findByRole('dialog')).getByRole('alert');
    expect(alert.textContent).toContain('Key not created');
    expect(alert.textContent).toContain('You do not have permission to create keys.');
    expect(toasts.length).toBe(before);
  });
});

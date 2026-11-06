import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string }[]);
vi.mock('@/components/ui/toast', () => ({ toast: (t: { tone: string; title: string; description?: string }) => { toasts.push(t); } }));

import { KeysView } from '@/views/keys';
import { hasSample } from './sample-present';

// The key list is drawn over the sample's own keys; a product that replaced the sample has none, so these cases are not
// applicable there rather than failing on an absent module (#131).
type Sample = typeof import('@/system/fixtures/sample-records');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample-records.ts', import.meta.url).pathname)) as Sample
  : null;
const API_KEYS = sample?.API_KEYS ?? [];

describe.skipIf(!sample)('the key list', () => {
  it('shows each key by its hint and never carries or reveals a full secret', () => {
    const { container } = render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => ({ ok: false, error: 'unused' })} revokeKey={async () => ({ ok: true })} />);
    expect(screen.getAllByText('zzm_live_…f601').length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toMatch(/zzm_(live|test)_[0-9a-f]{32}/);
    expect(screen.queryByRole('button', { name: /^Reveal/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Copy .* key$/ })).toBeNull();
  });
});

describe.skipIf(!sample)('creating a key', () => {
  it('still hands over the one-time key and shows a committed-write warning', async () => {
    const warning = 'The change applied, but the key list could not be refreshed.';
    const create = vi.fn(async () => ({ ok: true as const, key: { ...API_KEYS[0], name: 'Warning probe', secret: 'synthetic-one-time-key' }, warning }));
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={create} revokeKey={async () => ({ ok: true })} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]);
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Warning probe' } });
    await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create key' })); });
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByText('Copy Warning probe now')).toBeTruthy();
    expect(screen.queryByText('Key not created')).toBeNull();
    expect(toasts.at(-1)).toMatchObject({ title: 'Key created', description: warning });
  });

  it('says why it failed inside the open sheet, not in a toast over it', async () => {
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => ({ ok: false, error: 'You do not have permission to create keys.' })} revokeKey={async () => ({ ok: true })} />);
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

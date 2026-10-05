import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string }[]);
vi.mock('@/components/ui/toast', () => ({ toast: (t: { tone: string; title: string; description?: string }) => { toasts.push(t); } }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { KeysView } from '@/views/keys';
import { MembersView, type Result } from '@/views/members';
import { API_KEYS } from '@/system/fixtures/sample-records';
import { MEMBERS } from '@/system/fixtures/sample-members';

const deferred = () => { let resolve!: (r: Result) => void; const promise = new Promise<Result>((r) => { resolve = r; }); return { promise, resolve }; };

async function invite(name: string) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Invite member' })[0]);
  fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'ana@northwind.example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
}

describe('members, optimistically', () => {
  it('shows an invitation at once and rolls it back with the reason when it fails', async () => {
    const d = deferred();
    render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: () => d.promise, setStatus: async () => ({ ok: true }), remove: async () => ({ ok: true }) }} />);
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    await act(async () => { d.resolve({ ok: false, error: 'There is no seat left on this plan.' }); });
    await waitFor(() => expect(screen.queryByText('Ana Ruiz')).toBeNull());
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'There is no seat left on this plan.' });
  });
  it('keeps a successful invitation once the authoritative rows include it', async () => {
    const d = deferred();
    const actions = { invite: () => d.promise, setStatus: async () => ({ ok: true }) as Result, remove: async () => ({ ok: true }) as Result };
    const { rerender } = render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={actions} />);
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    await act(async () => { d.resolve({ ok: true }); });
    const added = { ...MEMBERS[0], id: 'mem_new', name: 'Ana Ruiz', email: 'ana@northwind.example', status: 'Invited' as const };
    rerender(<MembersView rows={[added, ...MEMBERS]} now="2026-10-05T09:01:00.000Z" actions={actions} />);
    await waitFor(() => expect(screen.getAllByText('Ana Ruiz')).toHaveLength(1));
  });
});

describe('keys, optimistically', () => {
  it('takes a revoked key away at once and brings it back with the reason when revoking fails', async () => {
    let fail!: (e: Error) => void;
    const revokeKey = () => new Promise<void>((_, reject) => { fail = reject; });
    const key = API_KEYS[0];
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => key} revokeKey={revokeKey} />);
    fireEvent.click(screen.getByRole('button', { name: `Revoke ${key.name}` }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke key' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: `Revoke ${key.name}` })).toBeNull());
    await act(async () => { fail(new Error('The key is in use by a running job.')); });
    expect(await screen.findByRole('button', { name: `Revoke ${key.name}` })).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', description: 'The key is in use by a running job.' });
  });
});

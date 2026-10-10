import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { tone: string; title: string; description?: string }) => { toasts.push(t); } }));
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
  it('shows an invitation at once, and on a refusal rolls it back and says why inside the reopened sheet, not in a toast', async () => {
    const d = deferred();
    render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: () => d.promise, setStatus: async () => ({ ok: true }), remove: async () => ({ ok: true }) }} />);
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    const before = toasts.length;
    await act(async () => { d.resolve({ ok: false, error: 'There is no seat left on this plan.' }); });
    await waitFor(() => expect(screen.queryByText('Ana Ruiz')).toBeNull());
    const alert = within(await screen.findByRole('dialog')).getByRole('alert');
    expect(alert.textContent).toContain('Invitation not sent');
    expect(alert.textContent).toContain('There is no seat left on this plan.');
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Ana Ruiz');
    expect(toasts.length).toBe(before);
  });
  it('rolls back and says so when the action itself fails, as a dropped connection does', async () => {
    let fail!: (e: Error) => void;
    const rejecting = () => new Promise<Result>((_, reject) => { fail = reject; });
    render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: rejecting, setStatus: async () => ({ ok: true }), remove: async () => ({ ok: true }) }} />);
    await invite('Rae Okafor');
    expect(await screen.findByText('Rae Okafor')).toBeTruthy();
    await act(async () => { fail(new Error('Failed to fetch')); });
    await waitFor(() => expect(screen.queryByText('Rae Okafor')).toBeNull());
    expect(within(await screen.findByRole('dialog')).getByRole('alert').textContent).toContain('The change did not reach the server. Try again.');
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Rae Okafor');
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

async function openMenu(name: string) {
  const trigger = screen.getByRole('button', { name: `Actions for ${name}` });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return trigger;
}
const rowOf = (name: string) => screen.getByText(name).closest('tr, [role="row"], li, article') as HTMLElement;
const noop = async (): Promise<Result> => ({ ok: true });

describe('members, status and removal', () => {
  const m = MEMBERS.find((x) => x.status === 'Active')!;
  it('shows a status change at once and puts the old status back with the reason when it is refused', async () => {
    const d = deferred();
    render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: noop, setStatus: () => d.promise, remove: noop }} />);
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Suspend' }));
    await waitFor(() => expect(within(rowOf(m.name)).getByText('Suspended')).toBeTruthy());
    await act(async () => { d.resolve({ ok: false, error: 'Owners cannot be suspended.' }); });
    await waitFor(() => expect(within(rowOf(m.name)).queryByText('Suspended')).toBeNull());
    expect(within(rowOf(m.name)).getByText('Active')).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'Owners cannot be suspended.' });
  });
  it('takes a removed member away at once, sends the removal when its Undo closes, and brings them back with the reason when it is refused', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const d = deferred();
      const remove = vi.fn(() => d.promise);
      render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: noop, setStatus: noop, remove }} />);
      await openMenu(m.name);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
      await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
      expect(toasts.at(-1)).toMatchObject({ tone: 'neutral', title: `${m.name} removed`, action: { label: 'Undo' } });
      expect(remove).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(8000); });
      expect(remove).toHaveBeenCalledWith(m.id);
      expect(screen.queryByText(m.name)).toBeNull();
      await act(async () => { d.resolve({ ok: false, error: 'The last owner cannot be removed.' }); });
      expect(await screen.findByText(m.name)).toBeTruthy();
      expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'The last owner cannot be removed.' });
    } finally {
      vi.useRealTimers();
    }
  });
  it('brings a removed member back on Undo and sends nothing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const remove = vi.fn(noop);
      render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={{ invite: noop, setStatus: noop, remove }} />);
      await openMenu(m.name);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
      await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
      await act(async () => { (toasts.at(-1) as unknown as { action: { onClick: () => void } }).action.onClick(); });
      expect(await screen.findByText(m.name)).toBeTruthy();
      await act(async () => { vi.advanceTimersByTime(8000); });
      expect(remove).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not overwrite newer authoritative rows that arrive while a change is pending, and rolls back only its own', async () => {
    const d = deferred();
    const actions = { invite: () => d.promise, setStatus: noop, remove: noop };
    const { rerender } = render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={actions} />);
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    const newer = { ...MEMBERS[0], id: 'mem_live', name: 'Zed Newcomer', email: 'zed@northwind.example', status: 'Active' as const };
    rerender(<MembersView rows={[newer, ...MEMBERS.slice(1)]} now="2026-10-05T09:00:30.000Z" actions={actions} />);
    expect(await screen.findByText('Zed Newcomer')).toBeTruthy();
    expect(screen.getByText('Ana Ruiz')).toBeTruthy();
    expect(screen.queryByText(MEMBERS[0].name)).toBeNull();
    await act(async () => { d.resolve({ ok: false, error: 'There is no seat left on this plan.' }); });
    await waitFor(() => expect(screen.queryByText('Ana Ruiz')).toBeNull());
    expect(screen.getByText('Zed Newcomer')).toBeTruthy();
    expect(screen.queryByText(MEMBERS[0].name)).toBeNull();
  });
});

describe('keys, optimistically', () => {
  it('takes a revoked key away at once and brings it back with the reason when revoking fails', async () => {
    let fail!: (e: Error) => void;
    const revokeKey = () => new Promise<void>((_, reject) => { fail = reject; });
    const key = API_KEYS[0];
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => ({ ...key, secret: 'zzm_live_' + '0'.repeat(32) })} revokeKey={revokeKey} />);
    fireEvent.click(screen.getByRole('button', { name: `Revoke ${key.name}` }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke key' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: `Revoke ${key.name}` })).toBeNull());
    await act(async () => { fail(new Error('The key is in use by a running job.')); });
    expect(await screen.findByRole('button', { name: `Revoke ${key.name}` })).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', description: 'The key is in use by a running job.' });
  });
});

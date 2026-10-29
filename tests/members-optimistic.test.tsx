import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { tone: string; title: string; description?: string }) => { toasts.push(t); } }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { KeysView } from '@/views/keys';
import { MembersView, type MemberActions, type Result } from '@/views/members';
import type { MemberRowAccess } from '@/data/member-mutations';
import { ADD_ONS, MAIN_ROLES } from '@/data/roles';
import { API_KEYS } from '@/system/fixtures/sample-records';
import { MEMBERS } from '@/system/fixtures/sample-members';

const deferred = () => { let resolve!: (r: Result) => void; const promise = new Promise<Result>((r) => { resolve = r; }); return { promise, resolve }; };

const noop = async (): Promise<Result> => ({ ok: true });
/** The boundary's answer for every row, as the page would pass it: the view is mounted on its own here. */
const ACCESS: Record<string, MemberRowAccess> = Object.fromEntries(MEMBERS.map((m) => [m.id, { changeRole: true, suspend: m.status === 'Active', reactivate: m.status === 'Suspended', remove: true, roles: MAIN_ROLES, addOns: ADD_ONS }]));
const view = (actions: MemberActions, rows = MEMBERS, now = '2026-10-05T09:00:00.000Z') => <MembersView rows={rows} now={now} actions={actions} access={ACCESS} roles={MAIN_ROLES} />;
/** The four actions a page passes, with whichever fakes a test is about replaced. */
const withActions = (over: Partial<MemberActions>): MemberActions => ({ invite: noop, setStatus: noop, remove: noop, assignRole: noop, ...over });

async function invite(name: string) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Invite member' })[0]);
  fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'ana@northwind.example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
}

describe('members, optimistically', () => {
  it('shows an invitation at once, and on a refusal rolls it back and says why inside the reopened sheet, not in a toast', async () => {
    const d = deferred();
    render(view(withActions({ invite: () => d.promise })));
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    const before = toasts.length;
    await act(async () => { d.resolve({ ok: false, error: 'There is no seat left on this plan.' }); });
    await waitFor(() => expect(screen.queryByText('Ana Ruiz')).toBeNull());
    const alert = within(await screen.findByRole('dialog')).getByRole('alert');
    expect(alert.textContent).toContain('Not invited');
    expect(alert.textContent).toContain('There is no seat left on this plan.');
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Ana Ruiz');
    expect(toasts.length).toBe(before);
  });
  it('rolls back and says so when the action itself fails, as a dropped connection does', async () => {
    let fail!: (e: Error) => void;
    const rejecting = () => new Promise<Result>((_, reject) => { fail = reject; });
    render(view(withActions({ invite: rejecting })));
    await invite('Rae Okafor');
    expect(await screen.findByText('Rae Okafor')).toBeTruthy();
    await act(async () => { fail(new Error('Failed to fetch')); });
    await waitFor(() => expect(screen.queryByText('Rae Okafor')).toBeNull());
    expect(within(await screen.findByRole('dialog')).getByRole('alert').textContent).toContain('The change did not reach the server. Try again.');
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Rae Okafor');
  });
  it('keeps a successful invitation once the authoritative rows include it', async () => {
    const d = deferred();
    const actions = withActions({ invite: () => d.promise });
    const { rerender } = render(view(actions));
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    await act(async () => { d.resolve({ ok: true }); });
    // A row the server hands back for a new member carries the day they joined, which is today: the table states the
    // order (newest joined first), so a row built from another member's older date belongs where that date belongs.
    const added = { ...MEMBERS[0], id: 'mem_new', name: 'Ana Ruiz', email: 'ana@northwind.example', status: 'Invited' as const, joined: '2026-10-05' };
    rerender(view(actions, [added, ...MEMBERS], '2026-10-05T09:01:00.000Z'));
    await waitFor(() => expect(screen.getAllByText('Ana Ruiz')).toHaveLength(1));
  });
});

describe('the invitation sheet', () => {
  it('names the workspace by the name its record holds, when the page could read it', async () => {
    render(<MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={withActions({})} access={ACCESS} roles={MAIN_ROLES} workspace="Acme Staging" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Invite member' })[0]);
    const sheet = await screen.findByRole('dialog');
    expect(sheet.textContent).toContain('Acme Staging');
    // The sample sends nothing, so the sheet promises no email.
    expect(sheet.textContent).not.toMatch(/email to join|get an email/i);
  });
  it('confirms what happened, a member listed as invited, and promises neither a message nor an acceptance', async () => {
    toasts.length = 0;
    render(view(withActions({})));
    await invite('Ana Ruiz');
    await waitFor(() => expect(toasts.length).toBe(1));
    expect(toasts[0].title).toBe('Invited ana@northwind.example');
    expect(`${toasts[0].title} ${toasts[0].description}`).not.toMatch(/sent|when they accept|email to/i);
    expect(toasts[0].description).toMatch(/listed as Invited/);
  });
  it('says the workspace, unnamed, when the page could not', async () => {
    render(view(withActions({})));
    fireEvent.click(screen.getAllByRole('button', { name: 'Invite member' })[0]);
    expect((await screen.findByRole('dialog')).textContent).toMatch(/this workspace/);
  });
});

async function openMenu(name: string) {
  const trigger = screen.getByRole('button', { name: `Actions for ${name}` });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return trigger;
}
const rowOf = (name: string) => screen.getByText(name).closest('tr, [role="row"], li, article') as HTMLElement;

describe('members, status and removal', () => {
  // The page reads the members newest-joined first (`readAll('members', { sort: { field: 'joined', dir: 'desc' } })`),
  // and the table states that order and pages it, so the first active member it shows is the newest of them. The
  // fixture's own first active row joined in August 2025 and is the 24th of 24.
  const m = [...MEMBERS].filter((x) => x.status === 'Active').sort((a, b) => (a.joined === b.joined ? 0 : a.joined > b.joined ? -1 : 1))[0];
  it('shows a status change at once and puts the old status back with the reason when it is refused', async () => {
    const d = deferred();
    render(view(withActions({ setStatus: () => d.promise })));
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Suspend' }));
    await waitFor(() => expect(within(rowOf(m.name)).getByText('Suspended')).toBeTruthy());
    await act(async () => { d.resolve({ ok: false, error: 'Owners cannot be suspended.' }); });
    await waitFor(() => expect(within(rowOf(m.name)).queryByText('Suspended')).toBeNull());
    expect(within(rowOf(m.name)).getByText('Active')).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'Owners cannot be suspended.' });
  });
  it('takes a removed member away at once, sends the removal when its toast closes, and brings them back with the reason when it is refused', async () => {
    const d = deferred();
    const remove = vi.fn(() => d.promise);
    render(view(withActions({ remove })));
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
    expect(toasts.at(-1)).toMatchObject({ tone: 'neutral', title: `${m.name} removed`, action: { label: 'Undo' } });
    expect(remove).not.toHaveBeenCalled();
    // The Toaster closes it when its time runs out, the time it waits while someone is on it included.
    await act(async () => { (toasts.at(-1) as unknown as { onClose: () => void }).onClose(); });
    expect(remove).toHaveBeenCalledWith(m.id);
    expect(screen.queryByText(m.name)).toBeNull();
    await act(async () => { d.resolve({ ok: false, error: 'The last owner cannot be removed.' }); });
    expect(await screen.findByText(m.name)).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'The last owner cannot be removed.' });
  });
  it('brings a removed member back on Undo and sends nothing, when the toast then closes too', async () => {
    const remove = vi.fn(noop);
    render(view(withActions({ remove })));
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
    const t = toasts.at(-1) as unknown as { action: { onClick: () => void }; onClose: () => void };
    await act(async () => { t.action.onClick(); t.onClose(); });
    expect(await screen.findByText(m.name)).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });
  it('does not bring back a member whose removal was sent when the tab was hidden, and says it was sent', async () => {
    const remove = vi.fn(noop);
    render(view(withActions({ remove })));
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
    const undo = (toasts.at(-1) as unknown as { action: { onClick: () => void } }).action;
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    } finally {
      visibility.mockRestore();
    }
    expect(remove).toHaveBeenCalledWith(m.id);
    await act(async () => { undo.onClick(); });
    expect(screen.queryByText(m.name)).toBeNull();
    expect(toasts.at(-1)).toMatchObject({ tone: 'neutral', title: `${m.name}'s removal was already sent` });
    (toasts.find((t) => t.title === `${m.name} removed`) as unknown as { onClose: () => void }).onClose();
    expect(remove).toHaveBeenCalledOnce();
  });
  it('changes a role through the sheet, showing it at once, and reopens the sheet with the reason when it is refused', async () => {
    const d = deferred();
    const assignRole = vi.fn(() => d.promise);
    render(view(withActions({ assignRole })));
    await openMenu(m.name);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Change role' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Key manager' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save role' }));
    // The boundary is handed the row, the role the sheet holds and the add-on just ticked, and the row shows it at once.
    await waitFor(() => expect(assignRole).toHaveBeenCalledWith({ id: m.id, role: m.role, addOns: ['Key manager'] }));
    await waitFor(() => expect(within(rowOf(m.name)).getAllByText(`${m.role} + Key manager`).length).toBeGreaterThan(0));
    await act(async () => { d.resolve({ ok: false, error: 'Only an Owner can give or take away the Owner role.' }); });
    // A refusal puts the row back and says why inside the sheet it was sent from, as a refused invitation does.
    const alert = within(await screen.findByRole('dialog')).getByRole('alert');
    expect(alert.textContent).toContain('Role not changed');
    expect(alert.textContent).toContain('Only an Owner can give or take away the Owner role.');
    await waitFor(() => expect(within(rowOf(m.name)).queryByText(`${m.role} + Key manager`)).toBeNull());
  });
  it('does not overwrite newer authoritative rows that arrive while a change is pending, and rolls back only its own', async () => {
    const d = deferred();
    const actions = withActions({ invite: () => d.promise });
    const { rerender } = render(view(actions));
    await invite('Ana Ruiz');
    expect(await screen.findByText('Ana Ruiz')).toBeTruthy();
    const newer = { ...MEMBERS[0], id: 'mem_live', name: 'Zed Newcomer', email: 'zed@northwind.example', status: 'Active' as const, joined: '2026-10-05' };
    rerender(view(actions, [newer, ...MEMBERS.slice(1)], '2026-10-05T09:00:30.000Z'));
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
    let fail!: (r: { ok: false; error: string }) => void;
    const revokeKey = () => new Promise<{ ok: false; error: string }>((resolve) => { fail = resolve; });
    const key = API_KEYS[0];
    render(<KeysView rows={API_KEYS} now="2026-10-05T09:00:00.000Z" createKey={async () => ({ ok: true, key: { ...key, secret: 'zzm_live_' + '0'.repeat(32) } })} revokeKey={revokeKey} />);
    fireEvent.click(screen.getByRole('button', { name: `Revoke ${key.name}` }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke key' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: `Revoke ${key.name}` })).toBeNull());
    await act(async () => { fail({ ok: false, error: 'The key is in use by a running job.' }); });
    expect(await screen.findByRole('button', { name: `Revoke ${key.name}` })).toBeTruthy();
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', description: 'The key is in use by a running job.' });
  });
});

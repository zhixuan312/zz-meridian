// Named cli-* so the payload leaves it out. What it holds is the behaviour of this repository's own team-owned views —
// `src/views/settings.tsx` and `src/views/members.tsx` — which an update leaves exactly as a project has them. A shipped
// test cannot pin it: a project created at 0.29.0 and updated to 0.30.0 has this release's test and its own older view,
// and its gate fails, on the type check for a prop the view does not take. That is what 0.30.0's consumer smoke found,
// and it is the rule this file follows: a shipped test asserts only what every generation of the file it covers shares.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const toasts = vi.hoisted(() => [] as { tone: string; title: string; description?: string }[]);
vi.mock('@/components/ui/toast', () => ({ UNDO_MS: 8000, toast: (t: { tone: string; title: string; description?: string }) => { toasts.push(t); } }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { SettingsBody } from '@/views/settings';
import { MembersView, type MemberActions, type Result } from '@/views/members';
import type { MemberRowAccess } from '@/data/member-mutations';
import { ADD_ONS, MAIN_ROLES } from '@/data/roles';
import { MEMBERS } from '@/system/fixtures/sample-members';

beforeEach(() => { toasts.length = 0; });

describe('a workspace that could not be read', () => {
  it('says so and offers no form, so the template’s name is never saved over the real one', () => {
    render(<SettingsBody may={{ workspaceRead: true, workspaceUpdate: true }} workspace={null} unreadable save={async () => ({ ok: true })} />);
    expect(screen.getByText('The workspace could not be read, so nothing here can be changed.')).toBeTruthy();
    expect(screen.queryByLabelText(/^Name/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});

describe('a removal held for Undo', () => {
  const noop = async (): Promise<Result> => ({ ok: true });
  const ACCESS: Record<string, MemberRowAccess> = Object.fromEntries(MEMBERS.map((m) => [m.id, { changeRole: true, suspend: m.status === 'Active', reactivate: m.status === 'Suspended', remove: true, roles: MAIN_ROLES, addOns: ADD_ONS }]));
  const view = (actions: MemberActions) => <MembersView rows={MEMBERS} now="2026-10-05T09:00:00.000Z" actions={actions} access={ACCESS} roles={MAIN_ROLES} />;
  const m = [...MEMBERS].filter((x) => x.status === 'Active').sort((a, b) => (a.joined === b.joined ? 0 : a.joined > b.joined ? -1 : 1))[0];

  it('is sent when the page goes away, and a refusal comes back with its reason', async () => {
    // The flush used to call the action and throw its answer away: a refused removal left the row gone and said nothing.
    let resolve!: (r: Result) => void;
    const remove = vi.fn(() => new Promise<Result>((r) => { resolve = r; }));
    render(view({ invite: noop, setStatus: noop, remove, assignRole: noop }));
    fireEvent.keyDown(screen.getByRole('button', { name: `Actions for ${m.name}` }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText(m.name)).toBeNull());
    // The tab is hidden with the Undo window still open: the removal is sent now rather than dropped.
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(remove).toHaveBeenCalledWith(m.id);
    await act(async () => { resolve({ ok: false, error: 'The last owner cannot be removed.' }); });
    // A refusal is a refusal here too: the person comes back and the reason is said.
    expect(toasts.at(-1)).toMatchObject({ tone: 'critical', title: 'Change not made', description: 'The last owner cannot be removed.' });
    await waitFor(() => expect(screen.getByText(m.name)).toBeTruthy());
  });
});

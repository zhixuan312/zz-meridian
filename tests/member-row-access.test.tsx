// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MembersView } from '@/views/members';

// Radix mounts a menu's content only when it opens, and a Sheet's body only when it is open, so a static render holds
// the row's trigger, its reason and its cells — never the menu items or the role choices. Those are what the page
// *passes* (proved by the member boundary's own check) and what a press reaches (the phase's persona runs).
vi.mock('next/navigation', () => ({
  usePathname: () => '/members',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

const rows = [
  { id: 'members_5', name: 'Lucas Meyer', email: 'lucas.meyer@example.com', role: 'Member' as const, addOns: ['Key manager' as const], team: 'Engineering' as const, status: 'Active' as const, joined: '2026-09-01', lastActive: '2026-10-03' },
  { id: 'members_12', name: 'Grace Liu', email: 'grace.liu@example.com', role: 'Viewer' as const, addOns: [], team: 'Sales' as const, status: 'Active' as const, joined: '2026-09-02', lastActive: '2026-10-02' },
];
const actions = { invite: async () => ({ ok: true as const }), setStatus: async () => ({ ok: true as const }), remove: async () => ({ ok: true as const }), assignRole: async () => ({ ok: true as const }) };
const view = (access: never) => renderToStaticMarkup(<MembersView rows={rows as never} now="2026-10-04T00:00:00.000Z" actions={actions as never} access={access} roles={['Owner', 'Admin', 'Member', 'Viewer']} />);

const ALLOWED = {
  members_5: { changeRole: true, suspend: true, reactivate: false, remove: true, roles: ['Admin', 'Member', 'Viewer'], addOns: ['Key manager'] },
  members_12: { changeRole: false, suspend: false, reactivate: false, remove: false, roles: [], addOns: [], reason: 'Only an Owner can change or remove an Owner.' },
};

describe('a member row shows what the person may do to it', () => {
  it("offers a row it may act on a menu trigger, and a row it may not no trigger at all", () => {
    const html = view(ALLOWED as never);
    expect(html).toContain('Lucas Meyer');
    expect(html).toContain('Grace Liu');
    // One trigger for the one row that may be acted on, named for that person.
    const triggers = html.match(/aria-label="Actions for [^"]+"/g) ?? [];
    expect(triggers).toEqual(['aria-label="Actions for Lucas Meyer"']);
  });

  it('keeps the refused row and says why, once', () => {
    const html = view(ALLOWED as never);
    expect(html.split('Only an Owner can change or remove an Owner.').length - 1).toBe(1);
  });

  it('reads a member with an add-on by their full role', () => {
    expect(view(ALLOWED as never)).toContain('Member + Key manager');
  });

  it('offers no row trigger when the page passes no capability for any row', () => {
    const none = { members_5: { ...ALLOWED.members_5, changeRole: false, suspend: false, remove: false, reason: 'You cannot change your own role.' }, members_12: ALLOWED.members_12 };
    const html = view(none as never);
    expect(html.match(/aria-label="Actions for [^"]+"/g) ?? []).toEqual([]);
    expect(html).toContain('You cannot change your own role.');
  });
});

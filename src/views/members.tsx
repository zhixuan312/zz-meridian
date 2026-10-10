'use client';

import { useShareView } from '@/components/base/use-share-view';
import { membersContext } from './members-context';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Trash2, UserCheck, UserCog, UserPlus, UserX } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame, Stack } from '@/components/base/shell';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Select } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { toast, UNDO_MS } from '@/components/ui/toast';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { formatDate, formatRelative } from '@/lib/format-date';
import { useLive } from '@/lib/live';
import { RolesMatrix } from './roles-matrix';
import { ACTIONS } from '@/data/features';
import type { MemberRowAccess } from '@/data/member-mutations';
import { roleLabel, whoCan, type AddOn, type MainRole } from '@/data/roles';
import { TEAMS, type Member } from '@/data/sample';
/** Colour only where a row needs a look: an open invitation and a suspension. Active is the normal case, so it stays quiet. */
const STATUS_TONE = { Active: 'neutral', Invited: 'accent', Suspended: 'warning' } as const;
const options = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
/** Names as a reader meets them, in table order: "Owners", "Owners and Admins" — the idiom the NoAccess copy uses. */
function list(names: readonly string[]): string {
  const plural = names.map((name) => `${name}s`);
  return plural.length < 2 ? plural.join('') : `${plural.slice(0, -1).join(', ')} and ${plural.at(-1)}`;
}
/**
 * Who manages the roster, read off the grant table through the action's own need — never a role name written here, so
 * editing `GRANTS` edits this sentence. A row that offers nothing because the caller lacks the grant says no more than
 * the page does: this line stands once above the table, where Task I-11 puts a withheld control's line. A product whose
 * table lets no single role invite gets no sentence, only the withheld controls.
 */
const MANAGERS = whoCan(ACTIONS['invite-member'].needs);
const MANAGE_LINE = MANAGERS.length ? `${list(MANAGERS)} manage members.` : null;
/** What a change reports back: the page toasts the reason and leaves the table as it was. */
export type Result = { ok: true } | { ok: false; error: string };
/** The page's server actions, passed in so the view stays free of server imports. */
export type MemberActions = {
  invite: (input: { name: string; email: string; role: Member['role']; team: Member['team'] }) => Promise<Result>;
  setStatus: (id: string, status: Member['status']) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
  /** Change a member's role and add-ons: the boundary decides, and a row the caller may not change is refused. */
  assignRole: (input: { id: string; role: MainRole; addOns: AddOn[] }) => Promise<Result>;
};
/** A row the table shows before the server has agreed: `pending` marks it until the authoritative rows replace it. */
type Shown = Member & { pending?: boolean };
type Change = { type: 'add'; row: Shown } | { type: 'status'; id: string; status: Member['status'] } | { type: 'remove'; id: string } | { type: 'role'; id: string; role: MainRole; addOns: AddOn[] };
/** An invitation, a status change, a removal and an assignment all take this one path, so the table never has two ways to be optimistic. */
function apply(rows: Shown[], change: Change): Shown[] {
  if (change.type === 'add') return [change.row, ...rows];
  if (change.type === 'remove') return rows.filter((m) => m.id !== change.id);
  if (change.type === 'role') return rows.map((m) => (m.id === change.id ? { ...m, role: change.role, addOns: change.addOns, pending: true } : m));
  return rows.map((m) => (m.id === change.id ? { ...m, status: change.status, pending: true } : m));
}
const BLANK = { name: '', email: '', role: 'Member' as Member['role'], team: 'Engineering' as Member['team'] };
/** What a row offers: nothing is offered when every one of the three actions is withheld. */
const offersWork = (a: MemberRowAccess) => a.changeRole || a.suspend || a.reactivate || a.remove;
/** The row whose role is being changed, with the choices the boundary allowed it: the sheet's own draft. */
type Draft = { id: string; name: string; role: MainRole; addOns: AddOn[]; roles: readonly MainRole[]; allowedAddOns: readonly AddOn[] };

/** `now` is the data's clock, so "last active" reads the same on the server and in the browser. */

export function MembersView({ rows, now, actions, access, roles }: { rows: Member[]; now: string; actions: MemberActions; /** What the boundary says of every row, read once by the page: the actions it offers this caller and why not. */ access: Record<string, MemberRowAccess>; /** The roles the page may put on an invitation, from the boundary's `invitableRoles`. */ roles: readonly MainRole[] }) {
  useShareView(membersContext(rows, now));
  const asOf = new Date(now);
  const router = useRouter();
  useLive(['members']);
  const [pending, start] = useTransition();
  const [shown, change] = useOptimistic<Shown[], Change>(rows, apply);
  const inFlight = useRef(new Set<string>());
  const tempId = useRef(0);
  const [inviting, setInviting] = useState(false);
  /** Removals waiting out their Undo: hidden at once, sent when the Undo window closes. */
  const [held, setHeld] = useState<ReadonlySet<string>>(new Set());
  const holds = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [invite, setInvite] = useState(BLANK);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  /** Why the server did not send the last invitation: said inside the sheet it was sent from, never in a toast over it. */
  const [inviteError, setInviteError] = useState<string | null>(null);
  /** The row whose role is being changed: the open Change role sheet, or null. */
  const [changing, setChanging] = useState<Draft | null>(null);
  /** Why the server did not change the last role: said inside the sheet it was sent from, as a refused invitation is. */
  const [roleError, setRoleError] = useState<string | null>(null);
  /** Nobody who may invite is given an empty list of roles, so no invite choices is no invitation, and no control. */
  const mayInvite = roles.length > 0;

  /**
   * Show `optimistic` at once, then run the action for the row `id`. The change stays until the transition ends, which waits for
   * the refreshed rows; on a refusal or a failed request the table goes back to the rows it was given, and the reason is
   * toasted, or handed to `failed` when the change came from a form that shows its own errors. A row with an action in
   * flight takes no second one.
   */
  const act = (id: string, optimistic: Change, action: () => Promise<Result>, done: { title: string; description?: string } | null, failed?: (reason: string) => void) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    start(async () => {
      change(optimistic);
      try {
        // A refusal comes back as a reason; an action that never answered (a dropped connection) throws, and is told the same way.
        const r = await action().catch((): Result => ({ ok: false, error: 'The change did not reach the server. Try again.' }));
        if (!r.ok) {
          if (failed) return failed(r.error);
          toast({ tone: 'critical', title: 'Change not made', description: r.error });
          return;
        }
        router.refresh();
        if (done) toast({ tone: 'positive', ...done });
      } finally {
        inFlight.current.delete(id);
      }
    });
  };

  const release = (id: string) => setHeld((h) => { const next = new Set(h); next.delete(id); return next; });
  /** Send a held removal now: when its Undo window closes, or when the page goes away first. */
  const commit = (m: Shown) => {
    clearTimeout(holds.current.get(m.id));
    holds.current.delete(m.id);
    act(m.id, { type: 'remove', id: m.id }, () => actions.remove(m.id), null);
    release(m.id);
  };
  /**
   * Remove takes the person away at once and offers Undo, as a deleted row in a list does, instead of asking first: a
   * removal is the kind of change a person makes on purpose and regrets by accident. It is sent when the Undo window
   * closes; a refusal brings them back with the reason, like any other change here.
   */
  const remove = (m: Shown) => {
    if (holds.current.has(m.id) || inFlight.current.has(m.id)) return;
    setHeld((h) => new Set(h).add(m.id));
    holds.current.set(m.id, setTimeout(() => commit(m), UNDO_MS));
    toast({
      tone: 'neutral',
      title: `${m.name} removed`,
      description: 'They lose access when this closes.',
      action: { label: 'Undo', onClick: () => { clearTimeout(holds.current.get(m.id)); holds.current.delete(m.id); release(m.id); } },
    });
  };
  // A removal waiting for its Undo is sent the moment the page goes away, never dropped: when the router hides the page
  // (its effects clean up), and when the tab is hidden or closed, which unmounts nothing.
  useEffect(() => {
    const live = holds.current;
    const flush = () => { for (const id of [...live.keys()]) { clearTimeout(live.get(id)); live.delete(id); void actions.remove(id); } };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', flush); flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Suspend or reactivate through the one path: the row shows the new status at once, or gets the reason back. */
  const setStatus = (m: Shown, status: Member['status']) => {
    act(m.id, { type: 'status', id: m.id, status }, () => actions.setStatus(m.id, status), status === 'Active'
      ? { title: 'Member reactivated', description: `${m.name} can sign in again.` }
      : { title: 'Member suspended', description: `${m.name} can no longer sign in.` });
  };
  /** Open the role sheet on the choices the boundary allowed this row — the same ones the submission is held to. */
  const openRole = (m: Shown, may: MemberRowAccess) => {
    setRoleError(null);
    setChanging({ id: m.id, name: m.name, role: m.role, addOns: [...m.addOns], roles: may.roles, allowedAddOns: may.addOns });
  };
  /** Send the sheet's role and add-ons through `actions.assignRole`; a refusal reopens it with its reason, holding the draft. */
  const assign = () => {
    const draft = changing!;
    setChanging(null);
    act(
      draft.id,
      { type: 'role', id: draft.id, role: draft.role, addOns: draft.addOns },
      () => actions.assignRole({ id: draft.id, role: draft.role, addOns: draft.addOns }),
      { title: 'Role changed', description: `${draft.name} is now ${roleLabel(draft)}.` },
      (reason) => { setChanging(draft); setRoleError(reason); },
    );
  };

  const send = () => {
    const e = {
      name: invite.name.trim() ? undefined : 'Name the person you are inviting.',
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invite.email.trim()) ? undefined : 'Enter their work email, like ana@northwind.example.',
    };
    setErrors(e);
    if (e.name || e.email) return;
    const draft = invite;
    const row: Shown = { id: `pending-${tempId.current++}`, name: draft.name.trim(), email: draft.email.trim(), role: draft.role, addOns: [], team: draft.team, status: 'Invited', joined: now.slice(0, 10), lastActive: null, pending: true };
    setInviting(false);
    setInvite(BLANK);
    setInviteError(null);
    act(row.id, { type: 'add', row }, () => actions.invite(draft), { title: `Invitation sent to ${row.email}`, description: `${row.name} joins as ${draft.role} on ${draft.team} when they accept.` }, (reason) => { setInvite(draft); setInviteError(reason); setInviting(true); });
  };

  const columns: Column<Shown>[] = [
    {
      key: 'name', header: 'Name', grow: true, truncate: true, mobile: 'title', sortValue: (m) => m.name,
      cell: (m) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={m.name} size="sm" />
          <span className="truncate font-medium">{m.name}</span>
          {m.pending ? <span className="t-caption shrink-0 text-ink-3" aria-busy="true">Saving…</span> : null}
        </span>
      ),
    },
    { key: 'email', header: 'Email', grow: true, muted: true, truncate: true, hideBelow: 'lg', sortValue: (m) => m.email, cell: (m) => m.email },
    // The role as a person reads it, add-ons and all, as a column and as a fact on the phone card (AC-3.2).
    { key: 'role', header: 'Role', hideBelow: 'md', mobile: 'fact', sortValue: (m) => m.role, cell: (m) => roleLabel(m), mobileCell: (m) => roleLabel(m) },
    { key: 'team', header: 'Team', muted: true, hideBelow: 'xl', sortValue: (m) => m.team, cell: (m) => m.team },
    { key: 'status', header: 'Status', mobile: 'fact', sortValue: (m) => m.status, cell: (m) => <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge> },
    // A card holds three facts, and adding the role spent one, so Joined leaves the phone card and stays in the table
    // at every width that has columns: Last active is the fact the page's own headline and the shared context answer for.
    { key: 'joined', header: 'Joined', numeric: true, muted: true, hideBelow: 'md', mobile: 'hidden', sortValue: (m) => m.joined, cell: (m) => formatDate(m.joined) },
    {
      key: 'active', header: 'Last active', numeric: true, mobile: 'fact', sortValue: (m) => m.lastActive ?? '',
      cell: (m) => (m.lastActive ? formatRelative(m.lastActive, asOf) : <span className="text-ink-3">Never</span>),
      mobileCell: (m) => (m.lastActive ? `Active ${formatRelative(m.lastActive, asOf)}` : 'Never active'),
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', mobile: 'status',
      cell: (m) => {
        const may = access[m.id];
        // A row the caller may not touch draws no control at all: its own reason where the restriction is the target's
        // — the first rule the boundary says fires — and nothing where the caller simply lacks the grant, which the
        // page's own line above the table already covers.
        if (!may || !offersWork(may)) return may?.reason ? <p className="t-caption max-w-[36ch] text-pretty">{may.reason}</p> : null;
        return (
          <Menu>
            <MenuTrigger asChild>
              <IconButton size="sm" variant="ghost" label={`Actions for ${m.name}`} icon={<MoreHorizontal />} disabled={m.pending} />
            </MenuTrigger>
            <MenuContent align="end">
              {may.changeRole ? <MenuItem onSelect={() => openRole(m, may)}><UserCog />Change role</MenuItem> : null}
              {may.suspend ? <MenuItem onSelect={() => setStatus(m, 'Suspended')}><UserX />Suspend</MenuItem> : null}
              {may.reactivate ? <MenuItem onSelect={() => setStatus(m, 'Active')}><UserCheck />Reactivate</MenuItem> : null}
              {may.remove ? <MenuSeparator /> : null}
              {may.remove ? <MenuItem tone="critical" onSelect={() => remove(m)}><Trash2 />Remove</MenuItem> : null}
            </MenuContent>
          </Menu>
        );
      },
    },
  ];

  // One line for the page, not one per row: who can, when a row offers nothing because the caller lacks the grant.
  const line = shown.some((m) => { const may = access[m.id]; return may !== undefined && !offersWork(may) && may.reason === undefined; }) ? MANAGE_LINE : null;

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Members"
      description="Who is in the workspace, what they can do, and when they last used it."
      actions={mayInvite ? <Button variant="primary" icon={<UserPlus />} onClick={() => { setInviteError(null); setInviting(true); }}>Invite member</Button> : undefined}
    >
      <Stack>
        {/* One line for the whole page, not one per row: who can manage the roster, when a row withholds its actions. */}
        {line ? <p className="t-caption max-w-[72ch]">{line}</p> : null}
        <DataTable
          caption="Members"
          noun="members"
          rows={held.size ? shown.filter((m) => !held.has(m.id)) : shown}
          columns={columns}
          rowKey={(m) => m.id}
          empty={{ title: 'No members yet', body: `Invite the people who work in ${app.name}.`, action: mayInvite ? <Button variant="primary" size="sm" icon={<UserPlus />} onClick={() => { setInviteError(null); setInviting(true); }}>Invite member</Button> : undefined }}
        />
        {/* What the table's roles and the page's own actions mean, generated from the same tables: the page's gate is
            this section's gate, so a person reading it has already been allowed to. */}
        <RolesMatrix />
      </Stack>

      <Sheet open={inviting} onOpenChange={setInviting}>
        <SheetContent
          title="Invite a member"
          description="They get an email to join the workspace."
          footer={<><SheetClose asChild><Button variant="ghost">Cancel</Button></SheetClose><Button variant="primary" busy={pending} onClick={send}>Send invitation</Button></>}
        >
          <div className="flex flex-col gap-6">
            {inviteError ? <Banner tone="critical" title="Invitation not sent">{inviteError}</Banner> : null}
            <Field label="Name" error={errors.name} required>
              {(p) => <Input {...p} value={invite.name} onChange={(e) => { setInvite({ ...invite, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} placeholder="Ana Costa" />}
            </Field>
            <Field label="Email" error={errors.email} required>
              {(p) => <Input {...p} type="email" value={invite.email} onChange={(e) => { setInvite({ ...invite, email: e.target.value }); setErrors({ ...errors, email: undefined }); }} placeholder={`ana@${app.name.toLowerCase().replace(/\s+/g, '')}.example`} />}
            </Field>
            <Field label="Role" hint="What they can change in the workspace.">
              {(p) => <Select {...p} value={invite.role} onValueChange={(role) => setInvite({ ...invite, role: role as Member['role'] })} options={options(roles)} />}
            </Field>
            <Field label="Team">
              {(p) => <Select {...p} value={invite.team} onValueChange={(team) => setInvite({ ...invite, team: team as Member['team'] })} options={options(TEAMS)} />}
            </Field>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={changing !== null} onOpenChange={(open) => { if (!open) { setChanging(null); setRoleError(null); } }}>
        <SheetContent
          title={changing ? `Change ${changing.name}'s role` : 'Change role'}
          description="Their role and add-ons decide what they can change in the workspace."
          footer={<><SheetClose asChild><Button variant="ghost">Cancel</Button></SheetClose><Button variant="primary" busy={pending} onClick={assign}>Save role</Button></>}
        >
          {/* Exactly the choices `memberAccess(id)` allowed this row, read when the sheet opened; a refusal reopens it here. */}
          {changing ? (
            <div className="flex flex-col gap-6">
              {roleError ? <Banner tone="critical" title="Role not changed">{roleError}</Banner> : null}
              <Field label="Role" hint="What they can change in the workspace.">
                {(p) => <Select {...p} value={changing.role} onValueChange={(role) => setChanging({ ...changing, role: role as MainRole })} options={options(changing.roles)} />}
              </Field>
              {changing.allowedAddOns.length ? (
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-sm font-medium">Add-ons</legend>
                  {changing.allowedAddOns.map((addOn) => (
                    <Checkbox
                      key={addOn}
                      label={addOn}
                      checked={changing.addOns.includes(addOn)}
                      onCheckedChange={(on) => setChanging((d) => (d ? { ...d, addOns: on ? [...d.addOns, addOn] : d.addOns.filter((x) => x !== addOn) } : d))}
                    />
                  ))}
                </fieldset>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

    </PageFrame>
  );
}

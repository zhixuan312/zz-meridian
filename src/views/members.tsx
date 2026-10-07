'use client';

import { useShareView } from '@/components/base/use-share-view';
import { membersContext } from './members-context';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame, Stack } from '@/components/base/shell';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Select } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { formatDate, formatRelative } from '@/lib/format-date';
import { useLive } from '@/lib/live';
import { ROLES, TEAMS, type Member } from '@/data/sample';

/** Colour only where a row needs a look: an open invitation and a suspension. Active is the normal case, so it stays quiet. */
const STATUS_TONE = { Active: 'neutral', Invited: 'accent', Suspended: 'warning' } as const;
const options = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
/** What a change reports back: the page toasts the reason and leaves the table as it was. */
export type Result = { ok: true } | { ok: false; error: string };
/** The page's server actions, passed in so the view stays free of server imports. */
export type MemberActions = {
  invite: (input: { name: string; email: string; role: Member['role']; team: Member['team'] }) => Promise<Result>;
  setStatus: (id: string, status: Member['status']) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
};
/** A row the table shows before the server has agreed: `pending` marks it until the authoritative rows replace it. */
type Shown = Member & { pending?: boolean };
type Change = { type: 'add'; row: Shown } | { type: 'status'; id: string; status: Member['status'] } | { type: 'remove'; id: string };
/** An invitation, a status change and a removal all take this one path, so the table never has a second way to be optimistic. */
function apply(rows: Shown[], change: Change): Shown[] {
  if (change.type === 'add') return [change.row, ...rows];
  if (change.type === 'remove') return rows.filter((m) => m.id !== change.id);
  return rows.map((m) => (m.id === change.id ? { ...m, status: change.status, pending: true } : m));
}
const BLANK = { name: '', email: '', role: 'Member' as Member['role'], team: 'Engineering' as Member['team'] };

/** `now` is the data's clock, so "last active" reads the same on the server and in the browser. */

export function MembersView({ rows, now, actions }: { rows: Member[]; now: string; actions: MemberActions }) {
  useShareView(membersContext(rows, now));
  const asOf = new Date(now);
  const router = useRouter();
  useLive(['members']);
  const [pending, start] = useTransition();
  const [shown, change] = useOptimistic<Shown[], Change>(rows, apply);
  const inFlight = useRef(new Set<string>());
  const tempId = useRef(0);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [invite, setInvite] = useState(BLANK);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  /** Why the server did not send the last invitation: said inside the sheet it was sent from, never in a toast over it. */
  const [inviteError, setInviteError] = useState<string | null>(null);

  /**
   * Show `optimistic` at once, then run the action for the row `id`. The change stays until the transition ends, which waits for
   * the refreshed rows; on a refusal or a failed request the table goes back to the rows it was given, and the reason is
   * toasted, or handed to `failed` when the change came from a form that shows its own errors. A row with an action in
   * flight takes no second one.
   */
  const act = (id: string, optimistic: Change, action: () => Promise<Result>, done: { title: string; description?: string }, failed?: (reason: string) => void) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    start(async () => {
      change(optimistic);
      try {
        // A refusal comes back as a reason; an action that never answered (a dropped connection) throws, and is told the same way.
        const r = await action().catch((): Result => ({ ok: false, error: 'The change did not reach the server. Try again.' }));
        if (!r.ok) {
          if (failed) return failed(r.error);
          return toast({ tone: 'critical', title: 'Change not made', description: r.error });
        }
        router.refresh();
        toast({ tone: 'positive', ...done });
      } finally {
        inFlight.current.delete(id);
      }
    });
  };

  const send = () => {
    const e = {
      name: invite.name.trim() ? undefined : 'Name the person you are inviting.',
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invite.email.trim()) ? undefined : 'Enter their work email, like ana@northwind.example.',
    };
    setErrors(e);
    if (e.name || e.email) return;
    const draft = invite;
    const row: Shown = { id: `pending-${tempId.current++}`, name: draft.name.trim(), email: draft.email.trim(), role: draft.role, team: draft.team, status: 'Invited', joined: now.slice(0, 10), lastActive: null, pending: true };
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
    { key: 'role', header: 'Role', hideBelow: 'md', sortValue: (m) => m.role, cell: (m) => m.role },
    { key: 'team', header: 'Team', muted: true, hideBelow: 'lg', mobile: 'fact', sortValue: (m) => m.team, cell: (m) => m.team },
    { key: 'status', header: 'Status', mobile: 'fact', sortValue: (m) => m.status, cell: (m) => <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge> },
    { key: 'joined', header: 'Joined', numeric: true, muted: true, hideBelow: 'xl', sortValue: (m) => m.joined, cell: (m) => formatDate(m.joined) },
    {
      key: 'active', header: 'Last active', numeric: true, mobile: 'fact', sortValue: (m) => m.lastActive ?? '',
      cell: (m) => (m.lastActive ? formatRelative(m.lastActive, asOf) : <span className="text-ink-3">Never</span>),
      mobileCell: (m) => (m.lastActive ? `Active ${formatRelative(m.lastActive, asOf)}` : 'Never active'),
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', mobile: 'status',
      cell: (m) => {
        const suspended = m.status === 'Suspended';
        return (
          <Menu>
            <MenuTrigger asChild>
              <IconButton size="sm" variant="ghost" label={`Actions for ${m.name}`} icon={<MoreHorizontal />} disabled={m.pending} />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => act(m.id, { type: 'status', id: m.id, status: suspended ? 'Active' : 'Suspended' }, () => actions.setStatus(m.id, suspended ? 'Active' : 'Suspended'), suspended
                ? { title: 'Member reactivated', description: `${m.name} can sign in again.` }
                : { title: 'Member suspended', description: `${m.name} can no longer sign in.` })}>
                {suspended ? <UserCheck /> : <UserX />}{suspended ? 'Reactivate' : 'Suspend'}
              </MenuItem>
              <MenuSeparator />
              <MenuItem tone="critical" onSelect={() => setRemoving(m)}><Trash2 />Remove</MenuItem>
            </MenuContent>
          </Menu>
        );
      },
    },
  ];

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Members"
      description="Who is in the workspace, what they can do, and when they last used it."
      actions={<Button variant="primary" icon={<UserPlus />} onClick={() => { setInviteError(null); setInviting(true); }}>Invite member</Button>}
    >
      <Stack>
        <DataTable
          caption="Members"
          noun="members"
          rows={shown}
          columns={columns}
          rowKey={(m) => m.id}
          empty={{ title: 'No members yet', body: `Invite the people who work in ${app.name}.`, action: <Button variant="primary" size="sm" icon={<UserPlus />} onClick={() => { setInviteError(null); setInviting(true); }}>Invite member</Button> }}
        />
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
              {(p) => <Select {...p} value={invite.role} onValueChange={(role) => setInvite({ ...invite, role: role as Member['role'] })} options={options(ROLES)} />}
            </Field>
            <Field label="Team">
              {(p) => <Select {...p} value={invite.team} onValueChange={(team) => setInvite({ ...invite, team: team as Member['team'] })} options={options(TEAMS)} />}
            </Field>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent
          size="sm"
          title={`Remove ${removing?.name ?? 'this member'}?`}
          description="They lose access to the workspace at once. This cannot be undone."
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant="danger" icon={<Trash2 />} busy={pending} onClick={() => {
                const m = removing!;
                setRemoving(null);
                act(m.id, { type: 'remove', id: m.id }, () => actions.remove(m.id), { title: 'Member removed', description: `${m.name} no longer has access.` });
              }}>Remove member</Button>
            </>
          }
        >
          {removing ? <p className="t-small text-ink-2">{removing.role} on {removing.team}, {removing.lastActive ? `last active ${formatRelative(removing.lastActive, asOf)}` : 'never active'}. To keep their history and block sign-in, suspend them instead.</p> : null}
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}

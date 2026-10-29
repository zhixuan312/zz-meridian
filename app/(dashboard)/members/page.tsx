import { gate, gatedMetadata, may } from '@/data/access';
import { RefusalScreen } from '@/views/refusal';
import { invitableRoles, memberAccess } from '@/data/member-mutations';
import { read, readAll } from '@/data/read';
import { assignRole, inviteMember, removeMember, setMemberStatus } from './actions';
import { MembersView } from '@/views/members';
import { projectMember } from '@/data/projections';

export function generateMetadata() {
  return gatedMetadata('members', { title: 'Members' });
}

/** The workspace's name from its record, for a person who may read it; nothing for anyone else, or when it cannot be read. */
async function workspaceName(): Promise<string | undefined> {
  if (!(await may('workspace:read'))) return undefined;
  try {
    const name = (await read('workspace')).rows[0]?.name;
    return typeof name === 'string' ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The members page asks its feature before it reads: the rail hides `/members` too, but that is presentation, not the gate.
 *
 * After the read it asks the member boundary what this caller may do to each row, and which roles it may invite with —
 * once per request, for the rows the page is about to show, never per row from the view. The boundary is the one every
 * member write passes, so the actions this page draws and the ones the server accepts cannot disagree; authority can
 * still change between the render and a submission, and then the submission is refused with its reason.
 *
 * The invitation names the workspace by the name its record holds, so the page reads that record for a person who may
 * read it. Everyone who may invite may: an Owner and an Admin both hold `workspace:read`.
 */
export default async function MembersPage() {
  const denied = await gate('members');
  if (denied) return RefusalScreen(denied);
  // The roles and the workspace's name do not wait on the roster; the members' access does.
  const [{ members, revision, observedAt, access }, roles, workspace] = await Promise.all([
    readAll('members', { sort: { field: 'joined', dir: 'desc' } }).then(async ({ rows, revision, observedAt }) => {
      const members = rows.map((row) => projectMember(row));
      return { members, revision, observedAt, access: await memberAccess(members.map((m) => m.id)) };
    }),
    invitableRoles(),
    workspaceName(),
  ]);
  return <MembersView rows={members} now={observedAt} revisions={revision ? { members: revision } : undefined} actions={{ invite: inviteMember, setStatus: setMemberStatus, remove: removeMember, assignRole }} access={access} roles={roles} workspace={workspace} />;
}

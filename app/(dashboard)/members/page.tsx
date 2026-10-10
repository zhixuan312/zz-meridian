import { gate } from '@/data/access';
import { invitableRoles, memberAccess, type MemberRowAccess } from '@/data/member-mutations';
import { read } from '@/data/read';
import { assignRole, inviteMember, removeMember, setMemberStatus } from './actions';
import { MembersView } from '@/views/members';
import type { Member } from '@/data/sample';

export const metadata = { title: 'Members' };

/**
 * The members page asks its feature before it reads: the rail hides `/members` too, but that is presentation, not the gate.
 *
 * After the read it asks the member boundary what this caller may do to each row, and which roles it may invite with —
 * once per request, for the rows the page is about to show, never per row from the view. The boundary is the one every
 * member write passes, so the actions this page draws and the ones the server accepts cannot disagree; authority can
 * still change between the render and a submission, and then the submission is refused with its reason.
 */
export default async function MembersPage() {
  const denied = await gate('members');
  if (denied) return denied;
  const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
  const members = rows as Member[];
  const [access, roles] = await Promise.all([
    Promise.all(members.map(async (m): Promise<readonly [string, MemberRowAccess]> => [m.id, await memberAccess(m.id)])).then((entries) => Object.fromEntries(entries)),
    invitableRoles(),
  ]);
  return <MembersView rows={members} now={observedAt} actions={{ invite: inviteMember, setStatus: setMemberStatus, remove: removeMember, assignRole }} access={access} roles={roles} />;
}

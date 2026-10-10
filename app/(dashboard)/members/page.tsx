import { gate } from '@/data/access';
import { read } from '@/data/read';
import { inviteMember, removeMember, setMemberStatus } from './actions';
import { MembersView } from '@/views/members';
import type { Member } from '@/data/sample';

export const metadata = { title: 'Members' };

/** The members page asks its feature before it reads: the rail hides `/members` too, but that is presentation, not the gate. */
export default async function MembersPage() {
  const denied = await gate('members');
  if (denied) return denied;
  const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
  return <MembersView rows={rows as Member[]} now={observedAt} actions={{ invite: inviteMember, setStatus: setMemberStatus, remove: removeMember }} />;
}

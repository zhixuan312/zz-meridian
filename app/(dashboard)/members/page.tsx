import { read } from '@/data/read';
import { inviteMember, removeMember, setMemberStatus } from './actions';
import { MembersView } from '@/views/members';
import type { Member } from '@/system/fixtures/sample-members';

export const metadata = { title: 'Members' };

export default async function MembersPage() {
  const { rows, observedAt } = await read('members', { sort: { field: 'joined', dir: 'desc' } });
  return <MembersView rows={rows as Member[]} now={observedAt} actions={{ invite: inviteMember, setStatus: setMemberStatus, remove: removeMember }} />;
}

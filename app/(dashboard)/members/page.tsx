import { connection } from 'next/server';
import { clock, members } from '@/data/collections';
import { inviteMember, removeMember, setMemberStatus } from './actions';
import { MembersView } from '@/views/members';

export const metadata = { title: 'Members' };

export default async function MembersPage() {
  await connection();
  const { rows } = await members.query({ sort: { field: 'joined', dir: 'desc' } });
  return <MembersView rows={rows} now={clock().toISOString()} actions={{ invite: inviteMember, setStatus: setMemberStatus, remove: removeMember }} />;
}

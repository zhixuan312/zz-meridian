import { connection } from 'next/server';
import { keys } from '@/data/collections';
import { KeysView } from '@/views/keys';
import { createKey, revokeKey } from './actions';

export const metadata = { title: 'API keys' };

export default async function KeysPage() {
  await connection();
  const { rows } = await keys.query({});
  return <KeysView rows={rows} createKey={createKey} revokeKey={revokeKey} />;
}

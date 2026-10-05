import { read } from '@/data/read';
import { KeysView } from '@/views/keys';
import type { ApiKey } from '@/data/sample';
import { createKey, revokeKey } from './actions';

export const metadata = { title: 'API keys' };

export default async function KeysPage() {
  const { rows } = await read('keys');
  return <KeysView rows={rows as ApiKey[]} createKey={createKey} revokeKey={revokeKey} />;
}

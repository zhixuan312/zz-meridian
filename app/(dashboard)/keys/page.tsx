import { redirect } from 'next/navigation';
import { can, resolveAccess, Unauthenticated } from '@/data/access';
import { read } from '@/data/read';
import { NoAccess } from '@/views/no-access';
import { KeysView } from '@/views/keys';
import type { ApiKey } from '@/data/sample';
import { createKey, revokeKey } from './actions';

export const metadata = { title: 'API keys' };

/**
 * The keys page asks `keys:read` first, before it reads anything: a person who may not see the keys gets the NoAccess
 * view and no record of theirs, and a request with no session is sent to sign-in. Only then does the page read.
 */
export default async function KeysPage() {
  const scope = await resolveAccess().catch((e: unknown) => {
    if (e instanceof Unauthenticated) redirect('/sign-in');
    throw e;
  });
  if (!(await can(scope, 'keys', 'read'))) return <NoAccess title="API keys" />;
  const { rows, observedAt } = await read('keys');
  return <KeysView rows={rows as ApiKey[]} now={observedAt} createKey={createKey} revokeKey={revokeKey} />;
}

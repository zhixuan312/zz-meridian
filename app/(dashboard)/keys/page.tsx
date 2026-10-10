import { gate, may } from '@/data/access';
import { ACTIONS } from '@/data/features';
import { read } from '@/data/read';
import { KeysView } from '@/views/keys';
import { actionLine } from '@/views/no-access';
import type { ApiKey } from '@/data/sample';
import { createKey, revokeKey } from './actions';

export const metadata = { title: 'API keys' };

/**
 * The keys page asks its feature first, before it reads anything: a person who may not see the keys gets the NoAccess
 * view and no record of theirs, and a request with no session is sent to sign-in. The rail hides `/keys` from that
 * person too, but hiding is presentation only — this check is the gate, and it runs before the read either way.
 *
 * After the gate it asks the action table what this person may do here, so the view draws Create key and Revoke only
 * where they may be used. A Member opens this page (they may read keys) but may not create or revoke one, and the line
 * says who can. The authority is a snapshot: a control shown here is still refused by the server action if it changed.
 */
export default async function KeysPage() {
  const denied = await gate('keys');
  if (denied) return denied;
  const { rows, observedAt } = await read('keys');
  const mayCreate = await may(ACTIONS['create-key'].needs);
  const mayRevoke = await may(ACTIONS['revoke-key'].needs);
  return (
    <KeysView
      rows={rows as ApiKey[]}
      now={observedAt}
      may={{ create: mayCreate, revoke: mayRevoke }}
      line={mayCreate ? undefined : actionLine('create-key')}
      createKey={createKey}
      revokeKey={revokeKey}
    />
  );
}

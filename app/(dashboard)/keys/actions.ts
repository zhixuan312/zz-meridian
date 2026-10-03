'use server';

// A server action is a public endpoint the dashboard layout does not guard: put your sign-in check in each action, the same
// check as the layout's and the assistant route's.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { clock, keys } from '@/data/collections';
import type { ApiKey } from '@/system/fixtures/sample-records';

const draft = z.object({
  name: z.string().trim().min(1, 'Name the key.'),
  env: z.enum(['live', 'test']),
  scopes: z.array(z.string()),
});

/** Creates a key and returns it: the only moment its full secret leaves the server for a banner. */
export async function createKey(input: z.input<typeof draft>): Promise<ApiKey> {
  const { name, env, scopes } = draft.parse(input);
  return keys.create!({ name, env, scopes, owner: 'Maya Chen', created: clock().toISOString(), lastUsed: null, secret: `zzm_${env}_${randomBytes(16).toString('hex')}` });
}

export async function revokeKey(id: string): Promise<void> {
  await keys.remove!([id]);
}

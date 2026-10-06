// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { createHash } from 'node:crypto';
import { createKey } from '../app/(dashboard)/keys/actions';
import { collectionFor, resolveAccess } from '@/data/access';

const draft = { name: 'Billing worker', env: 'live' as const, scopes: ['messages' as const] };

describe('createKey validates its scopes on the server', () => {
  it('creates a key with declared scopes', async () => {
    expect((await createKey({ ...draft, scopes: ['messages', 'files'] })).scopes).toEqual(['messages', 'files']);
  });
  it('refuses a key with no scope', async () => {
    await expect(createKey({ ...draft, scopes: [] })).rejects.toThrow(/scope/i);
  });
  it('refuses a scope that is not declared', async () => {
    await expect(createKey({ ...draft, scopes: ['messages', 'admin'] as never })).rejects.toThrow(/scope/i);
  });
});

describe('createKey shows the full secret once', () => {
  it('returns it to the caller and stores only its hint and its hash', async () => {
    const created = await createKey(draft);
    expect(created.secret).toMatch(/^zzm_live_[0-9a-f]{32}$/);
    const { rows } = await collectionFor(await resolveAccess(), 'keys').query({ where: [{ field: 'id', op: 'eq', value: created.id }] });
    const stored = rows[0] as Record<string, unknown>;
    expect(JSON.stringify(stored)).not.toContain(created.secret);
    expect(stored.hint).toBe(`zzm_live_…${created.secret.slice(-4)}`);
    expect(stored.secretHash).toBe(createHash('sha256').update(created.secret).digest('hex'));
  });
});

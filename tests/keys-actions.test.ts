// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { createHash } from 'node:crypto';
import { createKey } from '../app/(dashboard)/keys/actions';
import { collectionFor, resolveAccess } from '@/data/access';

const draft = { name: 'Billing worker', env: 'live' as const, scopes: ['messages' as const] };

describe('createKey validates its scopes on the server', () => {
  it('creates a key with declared scopes', async () => {
    const r = await createKey({ ...draft, scopes: ['messages', 'files'] });
    expect(r.ok && r.key.scopes).toEqual(['messages', 'files']);
  });
  it('refuses a key with no scope', async () => {
    expect(await createKey({ ...draft, scopes: [] })).toEqual({ ok: false, error: 'Give the key at least one scope.' });
  });
  it('refuses a scope that is not declared', async () => {
    expect(await createKey({ ...draft, scopes: ['messages', 'admin'] as never })).toEqual({ ok: false, error: 'Choose only the scopes a key can carry.' });
  });
});

describe('createKey shows the full secret once', () => {
  it('returns it to the caller and stores only its hint and its hash', async () => {
    const r = await createKey(draft);
    if (!r.ok) throw new Error(r.error);
    const created = r.key;
    expect(created.secret).toMatch(/^zzm_live_[0-9a-f]{32}$/);
    const { rows } = await collectionFor(await resolveAccess(), 'keys').query({ where: [{ field: 'id', op: 'eq', value: created.id }] });
    const stored = rows[0] as Record<string, unknown>;
    expect(JSON.stringify(stored)).not.toContain(created.secret);
    expect(stored.hint).toBe(`zzm_live_…${created.secret.slice(-4)}`);
    expect(stored.secretHash).toBe(createHash('sha256').update(created.secret).digest('hex'));
  });
});

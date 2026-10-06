// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { createKey } from '../app/(dashboard)/keys/actions';

const draft = { name: 'Billing worker', env: 'live' as const, scopes: ['messages'] };

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

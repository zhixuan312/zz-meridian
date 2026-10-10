// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const spy = vi.hoisted(() => ({ reads: [] as string[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', async (orig) => ({ ...(await orig<object>()), redirect: (to: string) => { throw new Error(`redirect ${to}`); } }));
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, read: async (name: string, q?: unknown) => { spy.reads.push(name); return real.read(name, q as never); } };
});

import KeysPage from '../app/(dashboard)/keys/page';
import { createKey } from '../app/(dashboard)/keys/actions';
import { keys, members } from '@/data/collections';

type Page = { props: Record<string, unknown> };
beforeEach(() => { jar.value = undefined; spy.reads.length = 0; });

describe('the keys page asks keys:read first', () => {
  it('shows NoAccess to a Viewer without reading keys', async () => {
    jar.value = 'members_12';
    expect(renderToStaticMarkup(await KeysPage())).toContain('data-no-access');
    expect(spy.reads).toEqual([]);
  });

  it('sends a person with no session to sign-in before any read', async () => {
    jar.value = 'members_999';
    await expect(KeysPage()).rejects.toThrow('redirect /sign-in');
    expect(spy.reads).toEqual([]);
  });

  it('reads the keys for a Key manager', async () => {
    jar.value = 'members_5';
    const page = (await KeysPage()) as unknown as Page;
    expect(spy.reads).toEqual(['keys']);
    expect(Array.isArray(page.props.rows) && page.props.rows.length > 0).toBe(true);
  });

  it("answers a demotion at the person's next request, with the same cookie", async () => {
    jar.value = 'members_4';
    expect(((await KeysPage()) as unknown as Page).props.rows).toBeDefined();
    await members.update!(['members_4'], { role: 'Viewer' });
    try {
      expect(renderToStaticMarkup(await KeysPage())).toContain('data-no-access');
    } finally {
      await members.update!(['members_4'], { role: 'Member' });
    }
  });
});

describe('a new key records who created it', () => {
  it('names the caller, not the sample owner', async () => {
    jar.value = 'members_5';
    const made = await createKey({ name: 'Gate check', env: 'test', scopes: ['messages'] });
    try {
      expect(made.owner).toBe('Lucas Meyer');
    } finally {
      await keys.remove!([made.id]);
    }
  });
});

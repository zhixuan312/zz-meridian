// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import KeysPage from '../app/(dashboard)/keys/page';
import { createKey } from '../app/(dashboard)/keys/actions';
import { keys, members } from '@/data/collections';

type Page = { props: Record<string, unknown> };
beforeEach(() => { jar.value = undefined; });

// Who may open the page, and that a refusal reads nothing, is tests/page-gates.test.tsx's.
describe('the keys page', () => {
  it('reads the keys for a Key manager', async () => {
    jar.value = 'members_5';
    const rows = ((await KeysPage()) as unknown as Page).props.rows;
    expect(Array.isArray(rows) && rows.length > 0).toBe(true);
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
    const r = await createKey({ name: 'Gate check', env: 'test', scopes: ['messages'] });
    if (!r.ok) throw new Error(r.error);
    const made = r.key;
    try {
      expect(made.owner).toBe('Lucas Meyer');
    } finally {
      await keys.remove!([made.id]);
    }
  });
});

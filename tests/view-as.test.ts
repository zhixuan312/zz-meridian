// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { chromeAccess } from '@/data/access';
import { members } from '@/data/collections';
import { roleLabel } from '@/data/roles';
import { MEMBERS } from '@/system/fixtures/sample-members';

/** What the chrome says about a member the sample holds: its name and its `roleLabel`, read from the record itself. */
const record = (id: string) => {
  const found = MEMBERS.find((m) => m.id === id);
  if (!found) throw new Error(`the sample holds no member ${id}`);
  return { name: found.name, role: roleLabel(found) };
};
/** The member the demo signs in as with no cookie: `DEFAULT_MEMBER` in `src/data/access.ts`, which is not exported. */
const DEFAULT_MEMBER = 'members_1';

beforeEach(() => { jar.value = undefined; });

describe('the chrome sees the person', () => {
  it('names the person with role and add-ons, and identifies the current persona', async () => {
    jar.value = 'members_5';
    const a = await chromeAccess();
    expect(a.user).toEqual(record('members_5'));
    expect(a.viewAs?.current).toBe('members_5');
    expect(a.viewAs?.options.every((o) => !o.disabled)).toBe(true);
  });

  it('shows the demo person as Owner with no cookie, and disables a persona who is not Active', async () => {
    expect((await chromeAccess()).user).toEqual(record(DEFAULT_MEMBER));
    await members.update!(['members_12'], { status: 'Suspended' });
    try {
      expect((await chromeAccess()).viewAs?.options.find((o) => o.id === 'members_12')?.disabled).toBe(true);
    } finally {
      await members.update!(['members_12'], { status: 'Active' });
    }
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { chromeAccess } from '@/data/access';
import { chooseViewAs } from '@/data/view-as';
import { members } from '@/data/collections';

beforeEach(() => { jar.value = undefined; });

describe('the chrome sees the person', () => {
  it('names the person with role and add-ons, and lists the five personas', async () => {
    jar.value = 'members_5';
    const a = await chromeAccess();
    expect(a.user).toEqual({ name: 'Lucas Meyer', role: 'Member + Key manager' });
    expect(a.viewAs?.current).toBe('members_5');
    expect(a.viewAs?.options.map((o) => [o.id, o.label])).toEqual([
      ['members_1', 'Maya Chen'], ['members_2', 'Jonas Weber'], ['members_4', 'Priya Nair'], ['members_5', 'Lucas Meyer'], ['members_12', 'Grace Liu'],
    ]);
    expect(a.viewAs?.options.every((o) => !o.disabled)).toBe(true);
    expect(a.viewAs?.choose).toBe(chooseViewAs);
  });

  it('shows Maya Chen as Owner with no cookie, and disables a persona who is not Active', async () => {
    expect((await chromeAccess()).user).toEqual({ name: 'Maya Chen', role: 'Owner' });
    await members.update!(['members_12'], { status: 'Suspended' });
    try {
      expect((await chromeAccess()).viewAs?.options.find((o) => o.id === 'members_12')?.disabled).toBe(true);
    } finally {
      await members.update!(['members_12'], { status: 'Active' });
    }
  });
});

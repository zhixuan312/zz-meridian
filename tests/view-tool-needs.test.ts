// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { AccessDenied } from '@/data/access';
import { FEATURES, type FeatureId } from '@/data/features';
import { viewTools } from '@/views/tools';

const byName = Object.fromEntries(viewTools.map((t) => [t.name, t]));
const known = new Set(Object.values(FEATURES).map((f) => f.needs));

beforeEach(() => { jar.value = undefined; });

describe('the view tools ask their feature', () => {
  it('takes each tool need from the feature table, not from a literal', () => {
    expect(viewTools.map((t) => t.name).sort()).toEqual(['analytics', 'customers', 'health', 'keys', 'members', 'overview', 'request', 'requests']);
    expect(known.has('requests:read')).toBe(true);
    for (const tool of viewTools) {
      expect(known.has(tool.needs), `${tool.name} restates its need`).toBe(true);
      expect(tool.needs, `${tool.name} asks another feature's need`).toBe(FEATURES[tool.name as FeatureId].needs);
    }
  });

  it('refuses the tools a Viewer may not use, and answers the ones they may', async () => {
    jar.value = 'members_12';
    await expect(byName.keys.read({})).rejects.toBeInstanceOf(AccessDenied);
    await expect(byName.members.read({})).rejects.toBeInstanceOf(AccessDenied);
    for (const name of ['overview', 'analytics', 'health', 'customers', 'requests']) {
      const input = name === 'overview' || name === 'analytics' ? { period: '30d' } : {};
      expect((await byName[name].read(input)).context.view, name).toBeTruthy();
    }
  });

  it('answers the keys and members tools for the people who may use them', async () => {
    jar.value = 'members_5';
    expect((await byName.keys.read({})).context.view).toBe('keys');
    jar.value = 'members_4';
    expect((await byName.members.read({})).context.view).toBe('members');
  });
});

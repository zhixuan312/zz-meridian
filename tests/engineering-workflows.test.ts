// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));

import { chromeAccess, may } from '@/data/access';
import { viewTools } from '@/logic/tools';

const DESTINATIONS = [
  { feature: 'tickets', href: '/operations-tickets' },
  { feature: 'tests', href: '/tests' },
  { feature: 'releases', href: '/releases' },
] as const;
const PERSONAS = ['members_1', 'members_2', 'members_4', 'members_5', 'members_12'];

beforeEach(() => { jar.value = undefined; });

describe('the three engineering destinations are registered', () => {
  it('for every persona: all five read all three, and only a Viewer may not write a ticket', async () => {
    for (const id of PERSONAS) {
      jar.value = id;
      const { only } = await chromeAccess();
      for (const d of DESTINATIONS) expect(only, `${id} reaches ${d.href}`).toContain(d.href);
      expect(await may('tickets:create'), id).toBe(id !== 'members_12');
      expect(await may('tickets:update'), id).toBe(id !== 'members_12');
    }
  });
});

describe('each destination is a view an assistant can open', () => {
  it('under its feature name, at its own address, for anyone who may read it', async () => {
    jar.value = 'members_12';
    for (const d of DESTINATIONS) {
      const tool = viewTools.find((t) => t.name === d.feature);
      expect(tool, d.feature).toBeTruthy();
      const { context } = await tool!.read({});
      expect(context, d.feature).toMatchObject({ view: d.feature, address: d.href });
      expect(context.facts.length, d.feature).toBeGreaterThan(0);
    }
  });

  it('and refuses somebody with no session', async () => {
    jar.value = 'members_999';
    for (const d of DESTINATIONS) await expect(viewTools.find((t) => t.name === d.feature)!.read({}), d.feature).rejects.toBeTruthy();
  });
});

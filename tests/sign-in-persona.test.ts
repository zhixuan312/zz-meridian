// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ set: [] as [string, string][] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: (n: string, v: string) => { jar.set.push([n, v]); } }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', async (orig) => ({ ...(await orig<object>()), redirect: (to: string) => { throw new Error(`redirect ${to}`); } }));

import { demoSignIn } from '../app/sign-in/actions';

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => { jar.set.length = 0; vi.stubEnv('DEMO_PASSWORD', 'open-sesame'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('the gated demo sign-in chooses who to be', () => {
  it('opens the console as the chosen persona after the right password', async () => {
    await expect(demoSignIn({ error: false }, form({ password: 'open-sesame', persona: 'members_12' }))).rejects.toThrow('redirect /');
    expect(jar.set.map(([n]) => n).sort()).toEqual(['zz_meridian_demo', 'zz_meridian_view_as']);
    expect(jar.set.find(([n]) => n === 'zz_meridian_view_as')?.[1]).toBe('members_12');
  });

  it('sets nothing for a wrong password', async () => {
    expect(await demoSignIn({ error: false }, form({ password: 'nope', persona: 'members_12' }))).toEqual({ error: true });
    expect(jar.set).toEqual([]);
  });

  it('sets nothing for a persona outside the list', async () => {
    expect(await demoSignIn({ error: false }, form({ password: 'open-sesame', persona: 'members_3' }))).toEqual({ error: true });
    expect(jar.set).toEqual([]);
  });
});

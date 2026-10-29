// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ set: [] as [string, string, { maxAge?: number }?][] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: (n: string, v: string, o?: { maxAge?: number }) => { jar.set.push([n, v, o]); } }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', async (orig) => ({ ...(await orig<object>()), redirect: (to: string) => { throw new Error(`redirect ${to}`); } }));

import { demoSignIn, signInAs } from '../app/sign-in/actions';
import { MAX_AGE } from '@/lib/demo-gate';

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => { jar.set.length = 0; vi.stubEnv('DEMO_PASSWORD', 'open-sesame'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('the gated demo sign-in chooses who to be', () => {
  it('opens the console as the chosen persona after the right password', async () => {
    await expect(demoSignIn({ error: null }, form({ password: 'open-sesame', persona: 'members_12' }))).rejects.toThrow('redirect /');
    expect(jar.set.map(([n]) => n).sort()).toEqual(['zz_meridian_demo', 'zz_meridian_view_as']);
    expect(jar.set.find(([n]) => n === 'zz_meridian_view_as')?.[1]).toBe('members_12');
  });

  it('keeps the persona as long as the session, so a browser restart reopens as the person chosen', async () => {
    await expect(demoSignIn({ error: null }, form({ password: 'open-sesame', persona: 'members_12' }))).rejects.toThrow('redirect /');
    expect(jar.set.map(([n, , o]) => [n, o?.maxAge])).toEqual([['zz_meridian_demo', MAX_AGE], ['zz_meridian_view_as', MAX_AGE]]);
    jar.set.length = 0;
    await expect(signInAs({}, form({ persona: 'members_4' }))).rejects.toThrow('redirect /');
    expect(jar.set.map(([n, v, o]) => [n, v, o?.maxAge])).toEqual([['zz_meridian_view_as', 'members_4', MAX_AGE]]);
  });

  it('sets nothing for a wrong password', async () => {
    expect(await demoSignIn({ error: null }, form({ password: 'nope', persona: 'members_12' }))).toEqual({ error: 'password', persona: 'members_12' });
    expect(jar.set).toEqual([]);
  });

  it('sets nothing for a persona outside the list', async () => {
    expect(await demoSignIn({ error: null }, form({ password: 'open-sesame', persona: 'members_3' }))).toEqual({ error: 'persona' });
    expect(jar.set).toEqual([]);
  });
});

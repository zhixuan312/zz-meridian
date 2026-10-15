// Named cli-* so the payload leaves it out: it is about the sample's own Home, which a product replaces.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
/**
 * `cache` as a request of the server renders it. The test runs on React's client build, whose `cache` remembers
 * nothing, so this stands in for the server's: one answer per request for each list of arguments, keyed first on how
 * many there are and then on each by identity, as React's server build keys it
 * (`node_modules/react/cjs/react.react-server.production.js`): `fn(p)` and `fn(p, undefined)` are two calls.
 */
const request = vi.hoisted(() => ({ memo: new Map<unknown, Map<unknown, unknown>>() }));
vi.mock('react', async (orig) => {
  const real = await orig<typeof import('react')>();
  const ANSWER = Symbol('answer');
  const cache = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A): R => {
    if (!request.memo.has(fn)) request.memo.set(fn, new Map());
    let node = request.memo.get(fn)!;
    for (const key of [args.length, ...args]) {
      if (!node.has(key)) node.set(key, new Map());
      node = node.get(key) as Map<unknown, unknown>;
    }
    if (!node.has(ANSWER)) node.set(ANSWER, fn(...args));
    return node.get(ANSWER) as R;
  };
  return { ...real, cache, default: { ...real, cache } };
});

import HomePage from '../app/(dashboard)/(home)/page';
import { homeTool } from '@/views/tools';

beforeEach(() => { request.memo.clear(); vi.restoreAllMocks(); });

/** Home as one request serves it, every boundary resolved. */
async function served(searchParams: { period?: string; day?: string }): Promise<string> {
  const element = (await HomePage({ searchParams: Promise.resolve(searchParams) })) as ReactElement;
  return new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
  });
}

describe("Home's one read", () => {
  it('is read once a request, by the title, the line, the actions and the body together', async () => {
    const read = vi.spyOn(homeTool, 'read');
    const html = await served({ period: '30d' });
    expect(html).toContain('What we sell');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('once with a day pointed at, too', async () => {
    const read = vi.spyOn(homeTool, 'read');
    await served({ period: '90d', day: '2026-09-21' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith({ period: '90d', day: '2026-09-21' });
  });
});

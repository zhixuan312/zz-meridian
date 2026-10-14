// Named cli-* so the payload leaves it out: it is about the sample's own Home, which a product replaces.
import { PassThrough } from 'node:stream';
import { createElement, type ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

import HomePage from '../app/(dashboard)/(home)/page';
import EmbedHomePage from '../app/embed/home/page';
import { can, collectionFor, resolveAccess, may } from '@/data/access';
import { collections } from '@/data/collections';
import { read } from '@/data/read';
import { handedTo } from '@/lib/assistant/scoped';
import { assistantTools } from '@/lib/assistant/tools';
import type { AnyCollection } from '@/lib/collection';
import { contextText } from '@/lib/shared-context';
import type { ViewTool } from '@/lib/shared-context';
import { homeTool, viewTools } from '@/views/tools';

const PERSONAS = { owner: 'members_1', admin: 'members_2', member: 'members_4', keyManager: 'members_5', viewer: 'members_12' };
const ALLOWED = [PERSONAS.owner, PERSONAS.admin];
const REFUSED = [PERSONAS.member, PERSONAS.keyManager, PERSONAS.viewer];
/** What names a cost or a margin, anywhere a person or an agent reads. */
const NAMED = /compute cost|gross margin|\bmargin\b/i;

beforeEach(() => { jar.value = undefined; });

/** A page as it is served, every boundary resolved: the words a person reads, without the markup. */
async function served(page: unknown): Promise<string> {
  const element = (await page) as ReactElement;
  return new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text.replace(/<[^>]*>/g, ' ')));
    const stream = renderToPipeableStream(createElement(Tooltip.Provider, null, element), { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
  });
}
const searchParams = () => Promise.resolve({ period: '30d' });
/** Every key of a value, at any depth. */
const keys = (v: unknown): string[] => (v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : []);

/** The tools the assistant is handed for this person, built as `app/api/assistant/route.ts` builds them. */
async function assistantFor(id: string) {
  jar.value = id;
  const scope = await resolveAccess();
  const readable = (await Promise.all(collections.map(async (c) => ((await can(scope, c.name, 'read')) ? handedTo(scope, collectionFor(scope, c.name), c.name) : null)))).filter((c): c is AnyCollection => c !== null);
  const views = (await Promise.all(viewTools.map(async (v) => ((await may(v.needs)) ? v : null)))).filter((v): v is ViewTool => v !== null);
  const guard = { authorize: async (name: string, op: 'create' | 'update' | 'remove', ids?: string[]) => can(scope, name, op, ids), invalidate: () => {} };
  return assistantTools(readable, { write() {}, merge() {}, onError: undefined } as never, guard as never, views).tools as Record<string, { execute: (input: unknown, options: unknown) => Promise<unknown> }>;
}

describe('compute cost and gross margin, for an Owner and an Admin', () => {
  it('are on Home, in its context, in its view tool and in what the assistant can query', async () => {
    for (const id of ALLOWED) {
      jar.value = id;
      const page = await served(HomePage({ searchParams: searchParams() }));
      expect(page, id).toMatch(/Compute cost/);
      expect(page, id).toMatch(/Gross margin/);
      jar.value = id;
      const { context, data } = await homeTool.read({ period: '30d' });
      expect(contextText(context), id).toMatch(/gross margin/i);
      expect(keys(data).some((k) => /cost|margin/i.test(k)), id).toBe(true);
      const tools = await assistantFor(id);
      expect(Object.keys(tools), id).toContain('query_costs');
      const viewed = (await tools.view_home.execute({ period: '30d' }, {})) as { context: string };
      expect(viewed.context, id).toMatch(/gross margin/i);
      const queried = (await tools.query_costs.execute({ limit: 5 }, {})) as { rows: unknown[] };
      expect(queried.rows.length, id).toBeGreaterThan(0);
    }
  });
});

describe('compute cost and gross margin, for a Member and a Viewer', () => {
  it('are in none of the four, with nothing in their place', async () => {
    for (const id of REFUSED) {
      jar.value = id;
      const page = await served(HomePage({ searchParams: searchParams() }));
      expect(page, id).not.toMatch(NAMED);
      // Compute in use stays: it is every role's.
      expect(page, id).toMatch(/Compute in use/);
      jar.value = id;
      const { context, data } = await homeTool.read({ period: '30d' });
      expect(contextText(context), id).not.toMatch(NAMED);
      expect(keys(data).filter((k) => /cost|margin/i.test(k)), id).toEqual([]);
      const tools = await assistantFor(id);
      expect(Object.keys(tools).filter((t) => /cost/i.test(t)), id).toEqual([]);
      const viewed = (await tools.view_home.execute({ period: '30d' }, {})) as { context: string };
      expect(viewed.context, id).not.toMatch(NAMED);
      // The read itself refuses, whatever asks it.
      jar.value = id;
      await expect(read('costs'), id).rejects.toThrow();
    }
  });

  it('are not on the embedded Home either', async () => {
    for (const id of REFUSED) {
      jar.value = id;
      const embed = await served(EmbedHomePage({ searchParams: Promise.resolve({ period: '30d' }) }));
      // The embedded Home leads with revenue, as the page does.
      expect(embed, id).toMatch(/Revenue/);
      expect(embed, id).not.toMatch(NAMED);
    }
  });
});

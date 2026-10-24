// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads the sample's own pages, contexts and guides.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const seen = vi.hoisted(() => ({ tools: [] as string[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
vi.mock('@/lib/assistant/config', () => ({
  assistantConfig: () => ({
    secret: 's'.repeat(43),
    model: new MockLanguageModelV4({
      doStream: async (o: { tools?: { name: string }[] }) => {
        seen.tools = (o.tools ?? []).map((t) => t.name);
        return { stream: new ReadableStream({ start(c) { for (const p of [{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]) c.enqueue(p as never); c.close(); } }) };
      },
    } as never),
  }),
}));

import { read } from '@/data/read';
import { viewTools } from '@/logic/tools';
import { POST } from '../app/api/assistant/route';

/**
 * The collections' `query_<name>` tools are gone (FR-48, AC-14.11): an agent reads through `view_<name>` and the page's
 * `explore_<view>`, and the write tools handed on a page are those of the collections its prepared query reads. No
 * context, page specification or guide names a `query_*` tool.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What stands out?' }] }];
async function toolsOn(address: string): Promise<string[]> {
  seen.tools = [];
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path: address, title: 'A page', text: '' } }) }));
  expect(res.status, address).toBe(200);
  await res.text();
  return seen.tools;
}
/** A page's address as a person reaches it: a detail page at one of its records. */
async function addressOf(page: string): Promise<string> {
  if (page === '/customers/[id]') return '/customers/northwind-labs';
  if (page === '/requests/[id]') return `/requests/${String((await read('requests', { limit: 1 })).rows[0].id)}`;
  return page;
}

afterEach(() => { jar.value = undefined; });

describe('the tools a person is handed on each page', () => {
  for (const view of viewTools) {
    it(`${view.name}: its own explore tool, every view tool, no query tool, and writes only where its prepared query reads`, async () => {
      jar.value = 'members_1';
      const tools = await toolsOn(await addressOf(view.page));
      expect(tools.filter((t) => t.startsWith('explore_'))).toEqual([`explore_${view.name}`]);
      expect(tools.filter((t) => t.startsWith('query_'))).toEqual([]);
      for (const v of viewTools) expect(tools).toContain(`view_${v.name}`);
      const reads = new Set(Object.values(view.explore!.sources).map((s) => s.collection));
      for (const t of tools.filter((x) => /^(create|update|remove)_/.test(x))) expect(reads.has(t.replace(/^(create|update|remove)_/, '')), `${t} on ${view.page}`).toBe(true);
    });
  }

  it('hands the members writes on Members and the key writes on API keys, and neither on the other', async () => {
    jar.value = 'members_1';
    const members = await toolsOn('/members');
    expect(members).toEqual(expect.arrayContaining(['update_members', 'remove_members']));
    expect(members.filter((t) => /^(create|update|remove)_keys$/.test(t))).toEqual([]);
    const keys = await toolsOn('/keys');
    expect(keys).toContain('remove_keys');
    expect(keys.filter((t) => /^(create|update|remove)_members$/.test(t))).toEqual([]);
  });
});

describe('nothing names a query tool', () => {
  const files = [
    ...fs.readdirSync(path.join(ROOT, 'src/logic')).filter((f) => /-context\.ts$/.test(f)).map((f) => `src/logic/${f}`),
    ...(fs.readdirSync(path.join(ROOT, 'app'), { recursive: true }) as string[]).filter((f) => f.endsWith('README.md')).map((f) => `app/${f}`),
    'docs/assistant.md',
    'docs/agents.md',
    ...fs.readdirSync(path.join(ROOT, 'skills/zz-meridian/references')).map((f) => `skills/zz-meridian/references/${f}`),
    'src/lib/assistant/tools.ts',
    'src/lib/assistant/prompt.ts',
  ];
  it('in a context, a page specification, the assistant guides or the assistant itself', () => {
    const naming = files.filter((f) => /\bquery_(\w+|<)/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(naming).toEqual([]);
  });
});

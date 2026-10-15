// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const policy = vi.hoisted(() => ({ refusal: 'explain' as 'explain' | 'absent' }));
const seen = vi.hoisted(() => ({ system: '' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// The product's choice, read where it is used: the sample declares `explain`, and a case here declares `absent`.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, get refusal() { return policy.refusal; } };
});
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
vi.mock('@/lib/assistant/config', () => ({
  assistantConfig: () => ({
    secret: 's'.repeat(43),
    model: new MockLanguageModelV4({
      doStream: async (o: { prompt: { role: string; content: unknown }[] }) => {
        seen.system = o.prompt.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n');
        return { stream: new ReadableStream({ start(c) { for (const p of [{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]) c.enqueue(p as never); c.close(); } }) };
      },
    } as never),
  }),
}));

import { POST } from '../app/api/assistant/route';

/**
 * The route names a withheld record's own page, the rail's destination that needs that read alone, so a Viewer asking
 * where keys are made is given API keys, whose refusal says who can open it, and not a page that makes none (scoreboard
 * round 5, W8). Under `absent` it names nothing, as the page names nothing.
 */
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Where do I create an API key?' }] }];
async function promptFor(member: string, refusal: 'explain' | 'absent'): Promise<string> {
  jar.value = member;
  policy.refusal = refusal;
  seen.system = '';
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path: '/', title: 'Home', text: '' } }) }));
  expect(res.status).toBe(200);
  await res.text();
  return seen.system;
}
afterEach(() => { jar.value = undefined; policy.refusal = 'explain'; });

describe("a withheld record's own page", () => {
  it("is named for a Viewer under explain: API keys and Members, each with its address; compute cost has none", async () => {
    const system = await promptFor('members_12', 'explain');
    expect(system).toContain('Its page is API keys (/keys), which tells this person who can open it.');
    expect(system).toContain('Its page is Members (/members), which tells this person who can open it.');
    expect(system).toMatch(/^- Compute cost: [^\n]*can read it\.$/m);
  });

  it('is named for nobody under absent', async () => {
    expect(await promptFor('members_12', 'absent')).not.toContain('Its page is');
  });
});

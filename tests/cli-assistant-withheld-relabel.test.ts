// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads what the sample's own Settings page reads.
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
// A product that labels Settings in its own words: the item still names its feature.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, nav: real.nav.map((g) => ({ ...g, items: g.items.map((i) => (i.href === "/settings" ? { ...i, label: "Workspace settings" } : i)) })), get refusal() { return policy.refusal; } };
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
import { nav } from '@/app.config';
import { FEATURES } from '@/data/features';

/**
 * A rail item is its feature's by the `feature` it names, so a product that labels a page in its own words keeps the
 * pages a withheld record is shown on (review round 3, R3-A3): features that share a need, as every `public` one does,
 * were told apart by the title the item was labelled with, and a relabelled Settings named no page for the workspace.
 */
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What is our workspace called?' }] }];
afterEach(() => { jar.value = undefined; policy.refusal = 'explain'; });

describe('a rail page labelled in the product\'s own words', () => {
  it('still shows the workspace, and the prompt says so under its label', async () => {
    jar.value = 'members_12';
    const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path: '/', title: 'Home', text: '' } }) }));
    expect(res.status).toBe(200);
    await res.text();
    const line = seen.system.split('\n').find((l) => l.startsWith('- Workspace: ')) ?? '';
    expect(line).toBe('- Workspace: Owner or Admin can read it. Owner can change it. Workspace settings (/settings) shows it to those roles; this person can open Workspace settings, where it is not shown to them.');
  });

  it("names, on each item that names one, a feature whose need is the item's", () => {
    const named = nav.flatMap((g) => g.items).filter((i) => i.feature !== undefined);
    expect(named.map((i) => i.href)).toEqual(['/settings', '/system', '/system/start/start-a-dashboard']);
    for (const i of named) expect(FEATURES[i.feature as keyof typeof FEATURES]?.needs, i.href).toBe(i.needs);
  });
});

// @vitest-environment node
// Named cli-* so the payload leaves it out: it reads what the sample's own Home, API keys and Members pages read.
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
 * Where the route says a withheld record is shown (AC-14.8 at review, C1): a Viewer on Home was told Home has no gross
 * margin and that no page they can open holds compute cost, because the route named a page only where a rail item needs
 * that one read alone. It names every page whose prepared query reads the record, whether this person may open it, and
 * what is worked out from it: compute cost is on Home, which a Viewer opens without it, and gross margin is worked out
 * from it. API keys and Members are pages a Viewer may not open, and they tell them who can.
 */
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What did compute cost us, and what was our gross margin?' }] }];
async function promptFor(member: string, refusal: 'explain' | 'absent'): Promise<string> {
  jar.value = member;
  policy.refusal = refusal;
  seen.system = '';
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path: '/', title: 'Home', text: '' } }) }));
  expect(res.status).toBe(200);
  await res.text();
  return seen.system;
}
const lineOf = (system: string, label: string) => system.split('\n').find((l) => l.startsWith(`- ${label}: `)) ?? '';
afterEach(() => { jar.value = undefined; policy.refusal = 'explain'; });

describe('what a Viewer may not read, and where it is shown', () => {
  it('compute cost is on Home, which they open without it, and gross margin is worked out from it', async () => {
    const line = lineOf(await promptFor('members_12', 'explain'), 'Compute cost');
    expect(line).toContain('Home (/) shows it to those roles; this person can open Home, where it is not shown to them.');
    expect(line).toContain('Worked out from it, and so withheld with it: Gross margin.');
    expect(line).not.toMatch(/who can open|tells them who can/);
  });

  it('API keys and Members are pages they may not open, which tell them who can', async () => {
    const system = await promptFor('members_12', 'explain');
    expect(lineOf(system, 'API keys')).toContain('API keys (/keys) shows it to those roles; this person may not open it, and it tells them who can.');
    expect(lineOf(system, 'Members')).toContain('Members (/members) shows it to those roles; this person may not open it, and it tells them who can.');
  });

  it('is said to nobody under absent', async () => {
    expect(await promptFor('members_12', 'absent')).not.toMatch(/shows it to those roles/);
  });
});

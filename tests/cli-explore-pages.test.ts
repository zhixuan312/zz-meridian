// @vitest-environment node
// Named cli-* so the payload leaves it out: it asks the sample's own pages of the sample's own records.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { UIMessage } from 'ai';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const seen = vi.hoisted(() => ({ calls: [] as { tools: { name: string }[]; prompt: { role: string; content: unknown }[] }[], script: [] as unknown[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const streamOf = (parts: unknown[]) => ({ stream: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(p as never); c.close(); } }) });
vi.mock('@/lib/assistant/config', () => ({
  assistantConfig: () => ({
    secret: 's'.repeat(43),
    model: new MockLanguageModelV4({
      doStream: async (o: { tools?: { name: string }[]; prompt: { role: string; content: unknown }[] }) => {
        seen.calls.push({ tools: o.tools ?? [], prompt: o.prompt });
        const next = seen.script.shift();
        if (next) return streamOf([next, { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage }]);
        return streamOf([{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'ok' }, { type: 'text-end', id: 't' }, { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]);
      },
    } as never),
  }),
}));

import { clock } from '@/data/collections';
import { WEEKDAY_HOURS } from '@/system/fixtures/company';
import { REQUESTS } from '@/system/fixtures/sample';
import { RUNS } from '@/system/fixtures/sample-engineering';
import { POST } from '../app/api/assistant/route';

/**
 * The three pages the scoring round caught answering by hand (W10, W11, and One customer's requests) answer from their
 * prepared queries: Usage the Sunday 22:00 cell, Tests the runs of the last seven complete days by how they ended, and
 * One customer its sampled requests by route. Each is asked through the route, as the person on that page, and the
 * figures are worked out here from the records.
 */
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Tell me.' }] }];
const fmt = (n: number) => n.toLocaleString('en-US');
const DAY = 86_400_000;
const today = clock().toISOString().slice(0, 10);
const back = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);

/** What `tool` returned when the model called it with `input` on `path`, as the text the model was handed next. */
async function answerOn(path: string, tool: string, input: object): Promise<{ tools: string[]; result: string }> {
  seen.calls = [];
  seen.script = [{ type: 'tool-call', toolCallId: 'c1', toolName: tool, input: JSON.stringify(input) }];
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path, title: 'A page', text: '' } }) }));
  expect(res.status).toBe(200);
  await res.text();
  const tool_ = seen.calls[1]?.prompt.filter((m) => m.role === 'tool') ?? [];
  // The tool result as text, with its JSON escapes undone so lines read as the model reads them.
  const result = JSON.stringify(tool_).replace(/\\n/g, '\n').replace(/\\"/g, '"');
  return { tools: seen.calls[0].tools.map((t) => t.name), result };
}

beforeEach(() => { jar.value = 'members_1'; });

describe('Usage, Tests and One customer answer from their prepared queries', () => {
  it('Usage: requests at 22:00 by weekday, Sunday first, and what the hours cannot say', async () => {
    const { tools, result } = await answerOn('/usage', 'explore_usage', { source: 'hours', measures: ['requests'], where: [{ field: 'hour', op: 'eq', value: 22 }], by: 'weekday' });
    expect(tools.filter((t) => t.startsWith('explore_'))).toEqual(['explore_usage']);
    const at22 = WEEKDAY_HOURS.filter((h) => h.hour === 22).sort((a, b) => b.requests - a.requests);
    expect(at22[0].weekday).toBe(6);
    expect(result).toMatch(new RegExp(`^- Sunday: ${fmt(at22[0].requests)}\\b`, 'm'));
    expect(result).toContain(fmt(at22[1].requests));
    expect(at22[0].requests / at22[1].requests).toBeGreaterThan(10);
    expect(result).toMatch(/not kept by customer and hour/i);
  });

  it('Tests: the runs of the last seven complete days, by how they ended, against the seven before', async () => {
    const { tools, result } = await answerOn('/tests', 'explore_tests', { source: 'runs', measures: ['runs'], by: 'state', period: '7d', compare: true });
    expect(tools.filter((t) => t.startsWith('explore_'))).toEqual(['explore_tests']);
    const inside = (from: string, to: string) => RUNS.filter((r) => r.startedAt.slice(0, 10) >= from && r.startedAt.slice(0, 10) <= to);
    const week = inside(back(7), back(1)), before = inside(back(14), back(8));
    const passed = week.filter((r) => r.state === 'passed').length;
    expect(passed).toBeGreaterThan(0);
    expect(result).toMatch(new RegExp(`^- passed: ${passed}\\b`, 'm'));
    expect(result).toContain(`${week.length} runs`);
    expect(result).toContain(`${before.length} runs`);
    expect(result).toContain(back(7));
    expect(result).toContain(back(1));
  });

  it("One customer: its sampled requests by route, said to be of the sample, with no other customer's", async () => {
    const { tools, result } = await answerOn('/customers/northwind-labs', 'explore_customer', { id: 'northwind-labs', source: 'requests', measures: ['requests'], by: 'route' });
    expect(tools.filter((t) => t.startsWith('explore_'))).toEqual(['explore_customer']);
    const mine = REQUESTS.filter((r) => r.customer === 'Northwind Labs');
    const byRoute = [...mine.reduce((m, r) => m.set(r.route, (m.get(r.route) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
    expect(byRoute.length).toBeGreaterThan(0);
    expect(result).toMatch(new RegExp(`^- ${byRoute[0][0].replace(/[/:]/g, (c) => `\\${c}`)}: ${byRoute[0][1]}\\b`, 'm'));
    expect(result).toContain(`${mine.length} requests`);
    expect(result).toMatch(/sample/i);
  });
});

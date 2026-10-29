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

import { nav } from '@/app.config';
import { can, may, resolveAccess } from '@/data/access';
import { collections } from '@/data/collections';
import { whoCan } from '@/data/roles';
import { POST } from '../app/api/assistant/route';

/**
 * The assistant is told nothing untrue: the addresses it may give are those this person may open; a
 * change exists only as the Proposal a tool returned; and a thing this person may not read is never "not in the
 * product". Under `explain` it is told what they may not read and who can, as the page tells them; under `absent`,
 * nothing, as the page names nothing. Built for each of the sample's five people, through the route that builds it.
 */
const PEOPLE = { Owner: 'members_1', Admin: 'members_2', Member: 'members_4', 'Key manager': 'members_5', Viewer: 'members_12' };
const ask: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What can I see here?' }] }];
const or = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`);

async function promptFor(member: string, refusal: 'explain' | 'absent'): Promise<string> {
  jar.value = member;
  policy.refusal = refusal;
  seen.system = '';
  const res = await POST(new Request('http://localhost/api/assistant', { method: 'POST', body: JSON.stringify({ messages: ask, page: { path: '/', title: 'Home', text: '' } }) }));
  expect(res.status).toBe(200);
  await res.text();
  return seen.system;
}
/** The addresses the prompt lists, as `- <label>: <address>`; a detail page's form (`/customers/<id>`) is left aside. */
const listed = (system: string) => system.split('\n').map((l) => /^- [^:]+: (\/\S*)$/.exec(l)?.[1]).filter((a): a is string => !!a && !a.includes('<')).sort();

afterEach(() => { jar.value = undefined; policy.refusal = 'explain'; });

describe("the assistant's prompt is true of the person it answers", () => {
  for (const [who, member] of Object.entries(PEOPLE)) {
    for (const refusal of ['explain', 'absent'] as const) {
      it(`lists exactly the addresses ${who} may open, and says what a change is, under ${refusal}`, async () => {
        const system = await promptFor(member, refusal);
        const open: string[] = [];
        for (const item of nav.flatMap((g) => g.items)) if (await may(item.needs)) open.push(item.href);
        expect(listed(system)).toEqual([...new Set(open)].sort());
        expect(system).toMatch(/name no other/i);
        expect(system).toContain('A change exists only as the Proposal a write tool returns.');
        expect(system).toContain('Never write that a change is proposed or awaiting approval unless a tool returned one.');
        expect(system).toContain('Some records exist that this person may not read.');
        expect(system).toContain('Never say that something is not in the product; say it is not something they may read here.');

        const scope = await resolveAccess();
        const withheld = [];
        for (const c of collections) if (!(await can(scope, c.name, 'read'))) withheld.push(c);
        for (const c of withheld) {
          const line = `- ${c.label}: ${or(whoCan(`${c.name}:read`))} can read it.`;
          if (refusal === 'explain') expect(system, c.name).toContain(line);
          else expect(system, c.name).not.toContain(`- ${c.label}:`);
        }
        if (refusal === 'absent') expect(system).not.toMatch(/can read it\.$/m);
        if (who === 'Viewer') expect(withheld.map((c) => c.name)).toEqual(expect.arrayContaining(['costs', 'keys', 'members']));
      });
    }
  }
});

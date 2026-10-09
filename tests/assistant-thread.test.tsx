import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import { convertToModelMessages, generateText, tool, type UIMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AssistantPanel } from '@/components/patterns/assistant';
import { THREAD_KEY, REASONS, clearThread, closeOpenApprovals, loadThread, saveThread } from '@/components/patterns/assistant/thread';

const ask = (id: string, text: string, page = { path: '/members', title: 'Members' }): UIMessage => ({ id, role: 'user', metadata: { page }, parts: [{ type: 'text', text }] });
const say = (id: string, text: string): UIMessage => ({ id, role: 'assistant', parts: [{ type: 'text', text }] });
/** A turn whose removal is still waiting for the person. */
const waiting = (): UIMessage[] => [
  ask('u1', 'Remove Alice Moreno'),
  { id: 'a1', role: 'assistant', parts: [
    { type: 'data-proposal', id: 'c1', data: { title: 'Remove Alice Moreno', tone: 'critical', changes: [{ label: 'Alice Moreno', from: 'Members', to: 'Removed' }] } },
    { type: 'tool-remove_members', toolCallId: 'c1', state: 'approval-requested', input: { ids: ['members_13'] }, approval: { id: 'ap1' } },
  ] } as UIMessage,
];
afterEach(() => localStorage.clear());

describe('the thread in local storage', () => {
  test('saves and loads under the product key, keeping only the last 100 messages', () => {
    const many = Array.from({ length: 130 }, (_, i) => (i % 2 ? say(`a${i}`, `answer ${i}`) : ask(`u${i}`, `question ${i}`)));
    saveThread(localStorage, many);
    expect(THREAD_KEY).toMatch(/\.assistant$/);
    expect(JSON.parse(localStorage.getItem(THREAD_KEY)!).v).toBe(1);
    const back = loadThread(localStorage);
    expect(back).toHaveLength(100);
    expect(back[0].id).toBe('u30');
    expect(back.at(-1)!.id).toBe('a129');
  });

  test('loading closes a waiting approval as expired, with the reload reason; nothing else changes', () => {
    saveThread(localStorage, waiting());
    const back = loadThread(localStorage);
    const part = back[1].parts.find((p) => p.type === 'tool-remove_members') as any;
    expect(part.state).toBe('output-denied');
    expect(part.approval).toMatchObject({ id: 'ap1', approved: false, reason: REASONS.reload });
    expect(back[0]).toEqual(waiting()[0]);
  });

  test('a missing, broken or foreign entry loads as an empty thread', () => {
    expect(loadThread(localStorage)).toEqual([]);
    localStorage.setItem(THREAD_KEY, '{not json');
    expect(loadThread(localStorage)).toEqual([]);
    localStorage.setItem(THREAD_KEY, JSON.stringify({ v: 99, messages: [] }));
    expect(loadThread(localStorage)).toEqual([]);
  });

  test('a save over the quota keeps the newer half and tries again', () => {
    const messages = Array.from({ length: 40 }, (_, i) => say(`a${i}`, `answer ${i}`));
    const store = new Map<string, string>();
    let calls = 0;
    const tight = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { calls++; if (calls === 1) throw new DOMException('full', 'QuotaExceededError'); store.set(k, v); }, removeItem: (k: string) => store.delete(k) } as unknown as Storage;
    saveThread(tight, messages);
    const kept = JSON.parse(store.get(THREAD_KEY)!).messages as UIMessage[];
    expect(kept).toHaveLength(20);
    expect(kept[0].id).toBe('a20');
  });

  test('clear removes the thread', () => {
    saveThread(localStorage, [ask('u1', 'hello')]);
    clearThread(localStorage);
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
  });
});

describe('closing waiting approvals before a new message', () => {
  test('closes them as expired with the moved-on reason, and both providers then receive a result for the call', async () => {
    const closed = closeOpenApprovals(waiting(), REASONS.movedOn);
    const part = closed[1].parts.find((p) => p.type === 'tool-remove_members') as any;
    expect(part.state).toBe('output-denied');
    expect(part.approval.reason).toBe(REASONS.movedOn);
    expect(closeOpenApprovals(closed, REASONS.reload)).toEqual(closed);

    const history = await convertToModelMessages([...closed, ask('u2', 'What is this page?')]);
    const tools = { remove_members: tool({ inputSchema: z.object({ ids: z.array(z.string()) }), execute: async () => 1 }) };
    const ok = { anthropic: { id: 'm', type: 'message', role: 'assistant', model: 'm', stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'ok' }] }, openai: { id: 'c', object: 'chat.completion', created: 1, model: 'm', usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }] } };
    for (const kind of ['anthropic', 'openai'] as const) {
      let body: any;
      const fetch = async (_: unknown, init: RequestInit) => { body = JSON.parse(String(init.body)); return new Response(JSON.stringify(ok[kind]), { headers: { 'content-type': 'application/json' } }); };
      const model = kind === 'anthropic' ? createAnthropic({ apiKey: 'k', fetch: fetch as typeof globalThis.fetch })('m') : createOpenAICompatible({ name: 'a', baseURL: 'https://x.example/v1', apiKey: 'k', fetch: fetch as typeof globalThis.fetch })('m');
      await generateText({ model, tools, messages: history });
      const text = JSON.stringify(body.messages);
      expect(text).toContain(REASONS.movedOn);
      expect(kind === 'anthropic' ? text.includes('"tool_result"') : body.messages.some((m: any) => m.role === 'tool')).toBe(true);
    }
  });
});

describe('the panel', () => {
  const panel = (props: Partial<Parameters<typeof AssistantPanel>[0]> = {}) =>
    render(<Tooltip.Provider><AssistantPanel inline messages={[]} onSend={() => {}} onClose={() => {}} onDecide={() => {}} onClear={() => {}} onRetry={() => {}} {...props} /></Tooltip.Provider>);

  test('each question shows the page it was asked on', () => {
    panel({ messages: [ask('u1', 'Who is inactive?'), say('a1', 'Two.'), ask('u2', 'Which keys are unused?', { path: '/keys', title: 'API keys' })] });
    expect(screen.getByText('On Members')).toBeInTheDocument();
    expect(screen.getByText('On API keys')).toBeInTheDocument();
  });

  test('Clear conversation empties the thread, and is not offered while it is empty', () => {
    const onClear = vi.fn();
    const { unmount } = panel({ onClear });
    expect(screen.getByRole('button', { name: 'Clear conversation' })).toBeDisabled();
    unmount();
    panel({ onClear, messages: [ask('u1', 'hello')] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('while it waits for the first words the thread says it is working, and stops once they arrive', () => {
    const { unmount } = panel({ busy: true, messages: [ask('u1', 'Why did latency rise?')] });
    expect(screen.getByRole('status', { name: 'Working on an answer' })).toBeInTheDocument();
    unmount();
    panel({ busy: true, messages: [ask('u1', 'Why did latency rise?'), say('a1', 'Latency rose')] });
    expect(screen.queryByRole('status', { name: 'Working on an answer' })).toBeNull();
  });

  test('an error is said in plain words with Retry', () => {
    const onRetry = vi.fn();
    panel({ messages: [ask('u1', 'hello')], error: 'The assistant could not reach its provider. Try again.', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('The assistant could not reach its provider.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

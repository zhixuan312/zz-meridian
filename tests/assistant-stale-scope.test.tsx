import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import type { UIMessage } from 'ai';
import { TextDecoderStream } from 'node:stream/web';

/** How often the route was refreshed: `router.refresh()` renders the layout again on the server, which resolves the scope again. */
const router = vi.hoisted(() => ({ refreshed: 0 }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh: () => { router.refreshed++; }, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';
import { AssistantScope } from '@/components/patterns/assistant/scope';
import { THREAD_KEY, dropThread, saveThread } from '@/components/patterns/assistant/thread';

/**
 * A tab left open while someone else signs in from another tab (issue #39). The server refuses its thread with 409; the
 * tab then refreshes, so the layout resolves the scope of whoever is signed in now, and the next question is asked as
 * them and answered. Neither the question it sent nor the 409 removes or replaces the conversation the person now
 * signed in stored from the other tab: a tab writes and removes only a thread of its own scope.
 */
const ask = (id: string, text: string): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const say = (id: string, text: string): UIMessage => ({ id, role: 'assistant', parts: [{ type: 'text', text }] });
afterEach(() => {
  localStorage.clear();
  router.refreshed = 0;
  vi.unstubAllGlobals();
});

const consoleOf = (scope: string) => (
  <Tooltip.Provider>
    <AssistantScope scope={Promise.resolve(scope)}>
      <AppShell rail={null} assistant={Promise.resolve(true)}>
        <PageFrame title="Home"><p>Traffic, reliability and spend.</p></PageFrame>
      </AppShell>
    </AssistantScope>
  </Tooltip.Provider>
);
async function openPanel(): Promise<HTMLElement> {
  const launcher = await screen.findByRole('button', { name: 'Assistant' }, { timeout: 20_000 });
  await act(async () => { fireEvent.click(launcher); });
  await waitFor(() => expect(document.querySelector('[data-assistant]')).not.toBeNull(), { timeout: 20_000 });
  return document.querySelector('[data-assistant]') as HTMLElement;
}
/** A UI message stream that answers with `text`, as the route streams one. */
const answer = (text: string) => new Response(
  [{ type: 'start' }, { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: text }, { type: 'text-end', id: 't' }, { type: 'finish' }].map((p) => `data: ${JSON.stringify(p)}\n\n`).join('') + 'data: [DONE]\n\n',
  { headers: { 'content-type': 'text/event-stream' } },
);
const stored = () => JSON.parse(localStorage.getItem(THREAD_KEY) ?? 'null') as { scope: string; messages: UIMessage[] } | null;

describe('a tab left open while someone else signs in from another tab', () => {
  test('learns the current scope after the 409, so the next question is answered, and keeps the other tab\'s thread', async () => {
    // The server now answers members_12, who signed in from another tab: a request naming members_1 is refused.
    const NOW = 'acme/members_12';
    const scopes: (string | undefined)[] = [];
    // jsdom has no TextDecoderStream, which the transport reads an answer's stream through.
    vi.stubGlobal('TextDecoderStream', TextDecoderStream);
    vi.stubGlobal('fetch', vi.fn(async (_: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { scope?: string };
      scopes.push(body.scope);
      if (body.scope !== NOW) return new Response('You are signed in as someone else now, so the earlier conversation was cleared. Ask again.', { status: 409 });
      return answer('Requests rose 4% this week.');
    }));
    let out!: ReturnType<typeof render>;
    await act(async () => { out = render(consoleOf('acme/members_1')); });
    const panel = await openPanel();
    // The other tab, members_12's, loads the console for them and stores its own thread after this tab opened.
    dropThread(localStorage, NOW);
    saveThread(localStorage, NOW, [ask('u9', 'Mine'), say('a9', 'Yours.')]);

    fireEvent.change(within(panel).getByRole('textbox'), { target: { value: 'First question?' } });
    fireEvent.click(within(panel).getByRole('button', { name: /send/i }));
    await waitFor(() => expect(panel.textContent).toContain('You are signed in as someone else now'));
    expect(stored()?.scope).toBe(NOW);
    expect(stored()?.messages.map((m) => m.id)).toEqual(['u9', 'a9']);
    await waitFor(() => expect(router.refreshed).toBe(1));
    // The refresh lands: the layout hands the shell the scope of whoever is signed in now, and their stored thread shows.
    await act(async () => { out.rerender(consoleOf(NOW)); });
    await waitFor(() => expect(document.querySelector('aside[data-assistant]')?.textContent).toContain('Yours.'), { timeout: 20_000 });

    const now = document.querySelector('aside[data-assistant]') as HTMLElement;
    fireEvent.change(within(now).getByRole('textbox'), { target: { value: 'Asked again?' } });
    fireEvent.click(within(now).getByRole('button', { name: /send/i }));
    await waitFor(() => expect(now.textContent).toContain('Requests rose 4% this week.'));
    expect(scopes).toEqual(['acme/members_1', NOW]);
    expect(stored()?.scope).toBe(NOW);
    expect(stored()?.messages.map((m) => m.id).slice(0, 2)).toEqual(['u9', 'a9']);
    expect(stored()?.messages.some((m) => m.parts.some((p) => p.type === 'text' && p.text === 'First question?'))).toBe(false);
  });
});

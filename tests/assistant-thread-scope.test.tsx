import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import type { UIMessage } from 'ai';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';
import { AssistantScope } from '@/components/patterns/assistant/scope';
import { THREAD_KEY, loadThread, saveThread } from '@/components/patterns/assistant/thread';

// jsdom has no IntersectionObserver; PageFrame observes its masthead.
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

/**
 * The thread belongs to the person and the tenant it was started for (issue #39): a change of either starts an empty
 * thread and the earlier one is never shown or sent; each request names the thread's scope, and a reply from the server
 * that the session changed hands since clears it, so an approval held in another tab cannot continue the earlier reply.
 */
const ask = (id: string, text: string): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const say = (id: string, text: string): UIMessage => ({ id, role: 'assistant', parts: [{ type: 'text', text }] });
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} }); });

describe('the stored thread', () => {
  test("loads only for the scope it was saved for; another scope's load is empty and removes it", () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'What did compute cost us?'), say('a1', '$1.2M')]);
    expect(loadThread(localStorage, 'acme/members_1').map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(loadThread(localStorage, 'acme/members_12')).toEqual([]);
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
  });

  test('a change of tenant is a change of scope', () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'hello')]);
    expect(loadThread(localStorage, 'globex/members_1')).toEqual([]);
  });
});

/** The console as a person on it: the shell, the page and the assistant scoped to `scope`. */
const consoleOf = (scope: string) => (
  <Tooltip.Provider>
    <AssistantScope scope={Promise.resolve(scope)}>
      <AppShell rail={null} assistant={Promise.resolve(true)}>
        <PageFrame title="Home"><p>Traffic, reliability and spend.</p></PageFrame>
      </AppShell>
    </AssistantScope>
  </Tooltip.Provider>
);
async function consoleFor(scope: string): Promise<ReturnType<typeof render>> {
  let out!: ReturnType<typeof render>;
  await act(async () => { out = render(consoleOf(scope)); });
  return out;
}
async function openPanel(): Promise<HTMLElement> {
  const launcher = await screen.findByRole('button', { name: 'Assistant' }, { timeout: 20_000 });
  // The panel waits for the scope: pressed inside an awaited act, the render it suspends is resumed when the scope settles.
  await act(async () => { fireEvent.click(launcher); });
  await waitFor(() => expect(document.querySelector('[data-assistant]')).not.toBeNull(), { timeout: 20_000 });
  return document.querySelector('[data-assistant]') as HTMLElement;
}

describe('the panel', () => {
  test("opened by another person shows none of the earlier person's thread, and the browser keeps none of it", async () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'What did compute cost us?'), say('a1', 'Compute cost $1.2M.')]);
    await consoleFor('acme/members_12');
    const panel = await openPanel();
    await waitFor(() => expect(within(panel).getByText(/Ask about this page: what a figure means/)).toBeTruthy());
    expect(panel.textContent).not.toContain('Compute cost $1.2M.');
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
  });

  test("opened by the same person shows their thread", async () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'What did compute cost us?'), say('a1', 'Compute cost $1.2M.')]);
    await consoleFor('acme/members_1');
    const panel = await openPanel();
    await waitFor(() => expect(panel.textContent).toContain('Compute cost $1.2M.'));
  });

  test('a change of person while it is open empties it, and nothing of the earlier thread is stored for the new person', async () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'What did compute cost us?'), say('a1', 'Compute cost $1.2M.')]);
    const { rerender } = await consoleFor('acme/members_1');
    const panel = await openPanel();
    await waitFor(() => expect(panel.textContent).toContain('Compute cost $1.2M.'));
    await act(async () => { rerender(consoleOf('acme/members_12')); });
    await waitFor(() => expect(document.querySelector('aside[data-assistant]')?.textContent).not.toContain('Compute cost $1.2M.'));
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
  });

  test("sends the thread's scope, and a reply that the session changed hands clears the thread and says why", async () => {
    saveThread(localStorage, 'acme/members_1', [ask('u1', 'What did compute cost us?'), say('a1', 'Compute cost $1.2M.')]);
    const bodies: { scope?: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response('You are signed in as someone else now, so the earlier conversation was cleared. Ask again.', { status: 409 });
    }));
    await consoleFor('acme/members_1');
    const panel = await openPanel();
    await waitFor(() => expect(panel.textContent).toContain('Compute cost $1.2M.'));
    fireEvent.change(within(panel).getByRole('textbox'), { target: { value: 'And the margin?' } });
    fireEvent.click(within(panel).getByRole('button', { name: /send/i }));
    await waitFor(() => expect(panel.textContent).toContain('You are signed in as someone else now'));
    expect(bodies[0].scope).toBe('acme/members_1');
    expect(panel.textContent).not.toContain('Compute cost $1.2M.');
    expect(panel.textContent).not.toContain('And the margin?');
    expect(within(panel).queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
  });
});

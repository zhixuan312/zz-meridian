import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { Providers } from '@/components/base/providers';
import { AppShell, PageFrame } from '@/components/base/shell';
import { THREAD_KEY } from '@/components/patterns/assistant/thread';
import { STORAGE_KEY } from '@/lib/preferences';
import { SettingsBody } from '@/views/settings';

// The shell and the Assistant section resolve the assistant promise behind Suspense, so the render is awaited inside act.
// This check is about the Assistant section, which every person keeps, so the page is rendered for someone who may do
// everything: the workspace section is the one tests/settings-access.test.tsx settles.
const may = { workspaceRead: true, workspaceUpdate: true };
const settings = (assistant: boolean) =>
  act(async () => {
    render(
      <Providers>
        <AppShell rail={null} assistant={Promise.resolve(assistant)}>
          <PageFrame title="Settings"><SettingsBody may={may} /></PageFrame>
        </AppShell>
      </Providers>,
    );
  });
const launcher = () => screen.queryByRole('button', { name: 'Assistant' });
/**
 * The launcher is a next/dynamic chunk, so it is absent at first whatever the rule says. Its module is loaded and the
 * shell given a turn to draw it before an absence is read, so a launcher drawn against the rule would be there.
 */
const loaded = () => act(async () => { await import('@/components/patterns/assistant/launcher'); await new Promise((r) => setTimeout(r, 50)); });
afterEach(() => localStorage.clear());

describe('the person\'s switch', () => {
  test('on by default; off hides the launcher and keeps the thread; on brings both back', async () => {
    localStorage.setItem(THREAD_KEY, JSON.stringify({ v: 2, scope: '', messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }] }));
    const saved = localStorage.getItem(THREAD_KEY);
    await settings(true);
    const toggle = screen.getByRole('switch', { name: /Show the assistant/ });
    expect(toggle).toBeChecked();
    // The assistant's code loads on demand (next/dynamic), so the launcher and the panel arrive a moment later; the
    // first import of the panel is the slowest step of the suite under a busy gate, so these two waits allow 20 s.
    await waitFor(() => expect(launcher()).not.toBeNull(), { timeout: 20_000 });
    fireEvent.click(launcher()!);
    await waitFor(() => expect(document.querySelector('[data-assistant]')).not.toBeNull(), { timeout: 20_000 });
    fireEvent.click(toggle);
    await waitFor(() => expect(launcher()).toBeNull());
    expect(document.querySelector('[data-assistant]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).assistant).toBe(false);
    expect(localStorage.getItem(THREAD_KEY)).toBe(saved);
    fireEvent.click(toggle);
    await waitFor(() => expect(launcher()).not.toBeNull());
    expect(localStorage.getItem(THREAD_KEY)).toBe(saved);
  });

  test('a stored "off" is honoured on the next visit', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ assistant: false }));
    await settings(true);
    await loaded();
    expect(launcher()).toBeNull();
    expect(screen.getByRole('switch', { name: /Show the assistant/ })).not.toBeChecked();
  });

  test('without the product\'s assistant there is no Assistant section and no switch', async () => {
    await settings(false);
    await loaded();
    expect(screen.queryByRole('switch', { name: /Show the assistant/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Assistant' })).toBeNull();
    expect(launcher()).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { Providers } from '@/components/base/providers';
import { AppShell, PageFrame } from '@/components/base/shell';
import { slug } from '@/app.config';
import { STORAGE_KEY } from '@/lib/preferences';
import { SettingsBody } from '@/views/settings';

// jsdom has no IntersectionObserver; PageFrame observes its masthead.
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

const settings = (assistant: boolean) =>
  render(
    <Providers>
      <AppShell rail={null} assistant={assistant}>
        <PageFrame title="Settings"><SettingsBody /></PageFrame>
      </AppShell>
    </Providers>,
  );
/** The thread's storage key (spec FR-13): the product slug and `.assistant`. */
const THREAD_KEY = `${slug}.assistant`;
const launcher = () => screen.queryByRole('button', { name: 'Assistant' });
afterEach(() => localStorage.clear());

describe('the person\'s switch', () => {
  test('on by default; off hides the launcher and keeps the thread; on brings both back', async () => {
    localStorage.setItem(THREAD_KEY, JSON.stringify({ v: 1, messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }] }));
    const saved = localStorage.getItem(THREAD_KEY);
    settings(true);
    const toggle = screen.getByRole('switch', { name: /Show the assistant/ });
    expect(toggle).toBeChecked();
    expect(launcher()).not.toBeNull();
    fireEvent.click(launcher()!);
    expect(document.querySelector('[data-assistant]')).not.toBeNull();
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
    settings(true);
    await waitFor(() => expect(launcher()).toBeNull());
    expect(screen.getByRole('switch', { name: /Show the assistant/ })).not.toBeChecked();
  });

  test('without the product\'s assistant there is no Assistant section and no switch', () => {
    settings(false);
    expect(screen.queryByRole('switch', { name: /Show the assistant/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Assistant' })).toBeNull();
    expect(launcher()).toBeNull();
  });
});

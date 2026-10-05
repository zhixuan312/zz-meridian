import { act, fireEvent, waitFor, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';

// jsdom has no IntersectionObserver; PageFrame observes its masthead.
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

// The shell resolves its assistant promise behind Suspense, so the render is awaited inside act.
const page = (assistant: boolean) =>
  act(async () => {
    render(
      <Tooltip.Provider>
        <AppShell rail={null} assistant={Promise.resolve(assistant)}>
          <PageFrame title="Overview"><p>Traffic, reliability and spend.</p></PageFrame>
        </AppShell>
      </Tooltip.Provider>,
    );
  });

describe('the assistant in the shell', () => {
  test('with the assistant off, nothing of it renders', async () => {
    await page(false);
    expect(screen.queryByRole('button', { name: 'Assistant' })).toBeNull();
    expect(document.querySelector('[data-assistant]')).toBeNull();
  });

  test('with it on, the panel starts closed, the launcher opens it, and send waits for text', async () => {
    await page(true);
    expect(document.querySelector('[data-assistant]')).toBeNull();
    // The assistant's code loads on demand (next/dynamic), so the launcher arrives a moment after the shell.
    fireEvent.click(await screen.findByRole('button', { name: 'Assistant' }));
    await waitFor(() => expect(document.querySelector('[data-assistant]')).not.toBeNull());
    const panel = document.querySelector('[data-assistant]') as HTMLElement;
    const send = within(panel).getByRole('button', { name: /send/i });
    expect(send).toBeDisabled();
    fireEvent.change(within(panel).getByRole('textbox'), { target: { value: 'What is this page?' } });
    expect(send).toBeEnabled();
    fireEvent.click(within(panel).getByRole('button', { name: /close/i }));
    expect(document.querySelector('[data-assistant]')).toBeNull();
  });
});

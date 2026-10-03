import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';

// jsdom has no IntersectionObserver; PageFrame observes its masthead.
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

const page = (assistant: boolean) =>
  render(
    <Tooltip.Provider>
      <AppShell rail={null} assistant={assistant}>
        <PageFrame title="Overview"><p>Traffic, reliability and spend.</p></PageFrame>
      </AppShell>
    </Tooltip.Provider>,
  );

describe('the assistant in the shell', () => {
  test('with the assistant off, nothing of it renders', () => {
    page(false);
    expect(screen.queryByRole('button', { name: 'Assistant' })).toBeNull();
    expect(document.querySelector('[data-assistant]')).toBeNull();
  });

  test('with it on, the panel starts closed, the launcher opens it, and send waits for text', () => {
    page(true);
    expect(document.querySelector('[data-assistant]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Assistant' }));
    const panel = document.querySelector('[data-assistant]') as HTMLElement;
    expect(panel).not.toBeNull();
    const send = within(panel).getByRole('button', { name: /send/i });
    expect(send).toBeDisabled();
    fireEvent.change(within(panel).getByRole('textbox'), { target: { value: 'What is this page?' } });
    expect(send).toBeEnabled();
    fireEvent.click(within(panel).getByRole('button', { name: /close/i }));
    expect(document.querySelector('[data-assistant]')).toBeNull();
  });
});

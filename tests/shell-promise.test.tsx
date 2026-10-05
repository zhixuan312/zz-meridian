import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame, useAssistantAvailable } from '@/components/base/shell';

vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

const page = (assistant: Promise<boolean>) =>
  render(
    <Tooltip.Provider>
      <AppShell rail={null} assistant={assistant}>
        <PageFrame title="Overview"><p>Traffic, reliability and spend.</p></PageFrame>
      </AppShell>
    </Tooltip.Provider>,
  );

describe('the shell with an assistant promise', () => {
  test('renders the page and reserves the launcher’s place, without a control, while pending', () => {
    page(new Promise<boolean>(() => {}));
    expect(screen.getByText('Traffic, reliability and spend.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Assistant' })).toBeNull();
    const slot = document.querySelector('[data-assistant-slot]');
    expect(slot).not.toBeNull();
    expect(slot?.getAttribute('aria-hidden')).toBe('true');
    expect(slot?.querySelector('button, a, [tabindex]')).toBeNull();
  });
  test('shows the launcher once the promise says the assistant is configured', async () => {
    page(Promise.resolve(true));
    expect(await screen.findByRole('button', { name: 'Assistant' })).toBeTruthy();
  });
  test('keeps the reserved place, inert, when it is not configured, so the row never shifts', async () => {
    const p = Promise.resolve(false);
    page(p);
    await act(async () => { await p; });
    expect(screen.queryByRole('button', { name: 'Assistant' })).toBeNull();
    const slot = document.querySelector('[data-assistant-slot]');
    expect(slot?.getAttribute('aria-hidden')).toBe('true');
    expect(slot?.querySelector('button, a, [tabindex]')).toBeNull();
    expect(document.querySelector('[data-assistant]')).toBeNull();
  });
  test('hands the same promise to the page', () => {
    const p = Promise.resolve(true);
    let got: Promise<boolean> | undefined;
    function Probe() { got = useAssistantAvailable(); return null; }
    render(<Tooltip.Provider><AppShell rail={null} assistant={p}><Probe /></AppShell></Tooltip.Provider>);
    expect(got).toBe(p);
  });
});

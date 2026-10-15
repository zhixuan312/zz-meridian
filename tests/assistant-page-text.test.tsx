import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';
import { pageText } from '@/components/patterns/assistant/page-text';

// jsdom has no IntersectionObserver; PageFrame observes its masthead.
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

/**
 * jsdom lays nothing out, so it has no `innerText`. This one is the part of a browser's the panel relies on: the text
 * of every node that is displayed, and none of a node whose display is none.
 */
const had = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get(this: HTMLElement) {
      const walk = (n: Node): string => (n.nodeType === Node.TEXT_NODE ? n.textContent ?? '' : n instanceof Element && getComputedStyle(n).display === 'none' ? '' : [...n.childNodes].map(walk).join(''));
      return walk(this);
    },
  });
});
afterAll(() => { if (had) Object.defineProperty(HTMLElement.prototype, 'innerText', had); else delete (HTMLElement.prototype as { innerText?: string }).innerText; });

/**
 * A page can keep a node out of the text the assistant reads (issue #38): a node marked `data-assistant="omit"` is never
 * sent, so a value shown once, such as a new key's secret, does not reach the model while it is on screen. The node is
 * shown as it was before and after the read.
 */
describe('the page text the assistant reads', () => {
  test('leaves out every node marked omit, and leaves each as it was drawn', () => {
    const region = document.createElement('div');
    region.innerHTML = '<h1>API keys</h1><p>Your new key: <code data-assistant="omit">sk-live-123</code></p><div data-assistant="omit" style="display: flex">Shown once</div><p>Copy it now.</p>';
    document.body.append(region);
    const text = pageText(region);
    expect(text).toContain('API keys');
    expect(text).toContain('Copy it now.');
    expect(text).not.toContain('sk-live-123');
    expect(text).not.toContain('Shown once');
    const [code, box] = region.querySelectorAll<HTMLElement>('[data-assistant="omit"]');
    expect(code.getAttribute('style')).toBeNull();
    expect(box.style.display).toBe('flex');
    region.remove();
  });

  test('is what the panel sends with a question', async () => {
    const bodies: { page: { text: string } }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 500 });
    }));
    await act(async () => {
      render(
        <Tooltip.Provider>
          <AppShell rail={null} assistant={Promise.resolve(true)}>
            <PageFrame title="API keys"><p>Your new key: <code data-assistant="omit">sk-live-123</code></p><p>Copy it now.</p></PageFrame>
          </AppShell>
        </Tooltip.Provider>,
      );
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Assistant' }, { timeout: 20_000 }));
    await waitFor(() => expect(document.querySelector('aside[data-assistant]')).not.toBeNull(), { timeout: 20_000 });
    const panel = document.querySelector('aside[data-assistant]') as HTMLElement;
    fireEvent.change(within(panel).getByRole('textbox'), { target: { value: 'What is on this page?' } });
    fireEvent.click(within(panel).getByRole('button', { name: /send/i }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].page.text).toContain('Copy it now.');
    expect(bodies[0].page.text).not.toContain('sk-live-123');
  });
});

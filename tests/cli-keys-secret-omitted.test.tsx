// Named cli-* so the payload leaves it out: it renders the sample's own API keys page.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/keys', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

import { KeysView } from '@/views/keys';
import { pageText } from '@/components/patterns/assistant/page-text';

/** jsdom lays nothing out, so it has no `innerText`: this one reads every displayed node's text and none of a hidden one. */
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
 * A new key's secret is shown once, on the API keys page, and never reaches the model (issue #38): a question asked, or
 * a card's Ask pressed, while the banner that shows it is up sends the page text without it. The person still sees the
 * whole key and can copy it; the assistant reads that a key was created, and nothing of its value.
 */
describe('a newly created key on the API keys page', () => {
  test('is drawn whole for the person, and is in none of the page text the panel sends', async () => {
    const secret = 'zzm_live_SECRETabcdef123456';
    const key = { id: 'k9', name: 'Billing worker', env: 'live' as const, hint: 'zzm_live_…3456', scopes: ['messages'], owner: 'Maya', created: '2026-10-01T00:00:00Z', lastUsed: null };
    const { container } = render(
      <div data-scroll-region="">
        <KeysView rows={[]} now="2026-10-04T00:00:00.000Z" createKey={async () => ({ ok: true, key: { ...key, secret } }) as never} revokeKey={async () => ({ ok: true })} />
      </div>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]);
    const sheet = await screen.findByRole('dialog');
    fireEvent.change(within(sheet).getByRole('textbox'), { target: { value: 'Billing worker' } });
    await act(async () => { fireEvent.click(within(sheet).getByRole('button', { name: 'Create key' })); });
    await waitFor(() => expect(container.textContent).toContain('Copy Billing worker now'));

    const region = container.querySelector<HTMLElement>('[data-scroll-region]')!;
    const sent = pageText(region);
    expect(sent).not.toContain(secret);
    expect(sent).toContain('Copy Billing worker now');
    expect(sent).toContain('This is the only time the full key is shown.');
    // Read, and still on screen as it was drawn: the whole key, with its Copy button.
    expect(within(screen.getByRole('group', { name: 'New key' })).getByText(secret).textContent).toBe(secret);
    screen.getByRole('button', { name: 'Copy New key' });
  });
});

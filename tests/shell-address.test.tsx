import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, NavTrigger } from '@/components/base/shell';

/**
 * A route with a parameter the build did not know has no pathname until the request, and a component that asks for one
 * waits for it. The shell asked at its top, so for such a route nothing was prerendered at all: the build's shell for
 * `/requests/[id]` was a file of 0 bytes, and every record's page waited whole. What reads the address is now a part of
 * its own behind its own boundary, and what those parts did they still do.
 */
const address = vi.hoisted(() => ({ path: '/', unknown: null as Promise<never> | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => { if (address.unknown) throw address.unknown; return address.path; },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

afterEach(() => { address.path = '/'; address.unknown = null; vi.useRealTimers(); });

const shell = (page = <p>The page</p>) => (
  <Suspense fallback={<p>Nothing yet</p>}>
    <AppShell rail={<p>The rail</p>} assistant={Promise.resolve(false)}>
      <NavTrigger />
      {page}
    </AppShell>
  </Suspense>
);

describe('the shell', () => {
  it('draws its frame and the page while the address is not known yet', async () => {
    address.unknown = new Promise<never>(() => {});
    const { container } = await act(async () => render(shell()));
    expect(screen.queryByText('Nothing yet')).toBeNull();
    expect(screen.getByText('The page')).toBeInTheDocument();
    expect(container.querySelector('aside[aria-label="Primary"]')).not.toBeNull();
  });

  it('opens the drawer from the page, and navigating closes it', async () => {
    const { rerender } = await act(async () => render(shell()));
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    address.path = '/requests';
    await act(async () => rerender(shell()));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('holds a page reached by navigating still, and releases it', async () => {
    vi.useFakeTimers();
    const { container, rerender } = await act(async () => render(shell()));
    const main = container.querySelector('main')!;
    expect(main.hasAttribute('data-still')).toBe(false);
    address.path = '/requests';
    rerender(shell());
    expect(main.hasAttribute('data-still')).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(main.hasAttribute('data-still')).toBe(false);
  });
});

import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, NavTrigger } from '@/components/base/shell';

/**
 * The drawer is a part of its own behind its own boundary, so it can arrive after the page that holds the button which
 * opens it: on a phone, a press in that window reached a handle with nothing behind it and was dropped (issue #32). The
 * drawer here is held back the way a route the build did not know holds it, by an address that is not known yet.
 */
const address = vi.hoisted(() => ({ path: '/', unknown: null as Promise<never> | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => { if (address.unknown) throw address.unknown; return address.path; },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

afterEach(() => { address.path = '/'; address.unknown = null; });

const shell = () => (
  <Suspense fallback={<p>Nothing yet</p>}>
    <AppShell rail={<p>The rail</p>} assistant={Promise.resolve(false)}>
      <NavTrigger />
      <p>The page</p>
    </AppShell>
  </Suspense>
);

describe('a press on Open navigation before the drawer has arrived', () => {
  it('is kept, and the drawer opens when it arrives', async () => {
    let arrive!: () => void;
    const waiting = new Promise<void>((resolve) => { arrive = resolve; });
    address.unknown = waiting as unknown as Promise<never>;
    await act(async () => { render(shell()); });
    expect(screen.getByText('The page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    address.unknown = null;
    await act(async () => { arrive(); await waiting; });
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
  });

  it('opens it once for one press, and a press after it is closed opens it again', async () => {
    let arrive!: () => void;
    const waiting = new Promise<void>((resolve) => { arrive = resolve; });
    address.unknown = waiting as unknown as Promise<never>;
    await act(async () => { render(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    address.unknown = null;
    await act(async () => { arrive(); await waiting; });
    await screen.findByRole('dialog', { name: 'Navigation' });
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
  });
});

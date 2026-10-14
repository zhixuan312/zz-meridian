import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AtlasShell, type AtlasNav } from '@/system/atlas-shell';

/**
 * The Atlas's contents drawer waits behind a boundary of its own, as the console's does, so on a phone a press on "Open
 * the contents" can come before the drawer is there. The press must be kept, as the console's is (issue #32). The drawer
 * is held back here the way a route the build did not know holds it, by an address that is not known yet.
 */
const address = vi.hoisted(() => ({ path: '/system', unknown: null as Promise<never> | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => { if (address.unknown) throw address.unknown; return address.path; },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

afterEach(() => { address.path = '/system'; address.unknown = null; });

const nav: AtlasNav = [{ id: 'start', title: 'Start', line: 'Where to begin', items: [{ href: '/system', title: 'Start here' }] }];
const shell = () => (
  <Suspense fallback={<p>Nothing yet</p>}>
    <AtlasShell nav={nav}><p>The entry</p></AtlasShell>
  </Suspense>
);

describe('a press on Open the contents before the drawer has arrived', () => {
  it('is kept, and the drawer opens when it arrives', async () => {
    let arrive!: () => void;
    const waiting = new Promise<void>((resolve) => { arrive = resolve; });
    address.unknown = waiting as unknown as Promise<never>;
    await act(async () => { render(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open the contents' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    address.unknown = null;
    await act(async () => { arrive(); await waiting; });
    expect(await screen.findByRole('dialog', { name: 'Contents' })).toBeInTheDocument();
  });

  it('opens it once for one press, and a press after it is closed opens it again', async () => {
    let arrive!: () => void;
    const waiting = new Promise<void>((resolve) => { arrive = resolve; });
    address.unknown = waiting as unknown as Promise<never>;
    await act(async () => { render(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open the contents' }));
    address.unknown = null;
    await act(async () => { arrive(); await waiting; });
    await screen.findByRole('dialog', { name: 'Contents' });
    fireEvent.click(screen.getByRole('button', { name: 'Close the contents' }));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open the contents' }));
    expect(await screen.findByRole('dialog', { name: 'Contents' })).toBeInTheDocument();
  });
});

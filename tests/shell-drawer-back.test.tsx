import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, NavTrigger } from '@/components/base/shell';

/** The address the shell reads, which a test moves the way a link and Back move it. */
const address = vi.hoisted(() => ({ path: '/usage' }));
vi.mock('next/navigation', () => ({
  usePathname: () => address.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

afterEach(() => { address.path = '/usage'; });

const shell = () => (
  <Suspense fallback={<p>Nothing yet</p>}>
    <AppShell rail={<p>The rail</p>} assistant={Promise.resolve(false)}>
      <NavTrigger />
      <p>The page</p>
    </AppShell>
  </Suspense>
);

describe('the navigation drawer, after a link in it is followed', () => {
  it('stays closed when Back returns to the page it was opened on', async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    // A link in the drawer to Home: the address changes, and the drawer closes.
    address.path = '/';
    await act(async () => { view.rerender(shell()); });
    expect(screen.queryByRole('dialog')).toBeNull();
    // Back to Usage: nobody pressed anything, so nothing opens.
    address.path = '/usage';
    await act(async () => { view.rerender(shell()); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens again on a press after the address changed', async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await screen.findByRole('dialog', { name: 'Navigation' });
    address.path = '/';
    await act(async () => { view.rerender(shell()); });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
  });
});

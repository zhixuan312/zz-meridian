// The phone drawer is a modal dialog and opens without forcing a layout inside the tap: focusing its first item in the
// open's commit forced a whole-page layout, which dropped a frame on the runner's phone (run 39132502117).
import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell, NavTrigger } from '@/components/base/shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/usage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

const shell = () => (
  <Suspense fallback={<p>Nothing yet</p>}>
    <AppShell rail={<nav aria-label="Main"><button type="button">Home</button><button type="button">Usage</button></nav>} assistant={Promise.resolve(false)}>
      <NavTrigger />
      <p>The page</p>
    </AppShell>
  </Suspense>
);

describe('the phone drawer', () => {
  it('focuses nothing inside the tap, and focus is in the sheet a frame later', async () => {
    await act(async () => { render(shell()); });
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Open navigation' })); });
    const dialog = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(focus).not.toHaveBeenCalled();
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(dialog.contains(document.activeElement)).toBe(true);
    focus.mockRestore();
  });
  it('stays modal: the page behind is hidden from assistive technology and Escape returns focus to the trigger', async () => {
    await act(async () => { render(shell()); });
    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    act(() => { trigger.focus(); fireEvent.click(trigger); });
    await screen.findByRole('dialog', { name: 'Navigation' });
    expect(screen.getByText('The page').closest('[aria-hidden="true"]')).not.toBeNull();
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    act(() => { fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    // Radix's focus scope gives focus back a task after it unmounts.
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(document.activeElement).toBe(trigger);
  });
});

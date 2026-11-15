// The navigation drawer cannot be opened above 1024px and its trigger is hidden there, but an open one stayed open: its
// overlay and content are `lg:hidden`, while Radix keeps the rest of the page `aria-hidden` and the scroll locked. A phone
// widened, or a window rotated into landscape, left a page that could not be used with nothing on screen to close it.
import { useState } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { useNavDrawer } from '@/components/base/use-nav-drawer';

/** A matchMedia whose answer the test sets and whose listeners it can fire. */
function media() {
  const state = { matches: false, listeners: new Set<(e: { matches: boolean }) => void>() };
  globalThis.matchMedia = ((query: string) => ({
    get matches() { return state.matches; },
    media: query,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => state.listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => state.listeners.delete(fn),
  })) as unknown as typeof globalThis.matchMedia;
  return state;
}

function Drawer() {
  const [asked] = useState(1);
  const { open } = useNavDrawer(asked, { current: null });
  return <p>{open ? 'open' : 'closed'}</p>;
}

describe('the navigation drawer when the viewport grows', () => {
  it('closes at 1024px, where its trigger is hidden and the page behind it must be usable again', () => {
    const wide = media();
    const { container } = render(<Drawer />);
    expect(container.textContent).toBe('open');
    act(() => {
      wide.matches = true;
      for (const fn of wide.listeners) fn({ matches: true });
    });
    expect(container.textContent).toBe('closed');
  });

  it('stays open while the viewport is narrow', () => {
    const wide = media();
    const { container } = render(<Drawer />);
    act(() => { for (const fn of wide.listeners) fn({ matches: false }); });
    expect(container.textContent).toBe('open');
  });
});

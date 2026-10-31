import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostContext } from '@/lib/host';

const host = vi.hoisted(() => ({ theme: 'light' as 'light' | 'dark' | undefined, context: null as null | ((context: HostContext) => void) }));
vi.mock('@/lib/host', () => ({
  HostBridge: class {
    static framed() { return true; }
    onContext(listener: (context: HostContext) => void) { host.context = listener; return () => { host.context = null; }; }
    initialize() { host.context?.({ theme: host.theme }); return Promise.resolve(); }
    sizeChanged() {}
    dispose() {}
  },
}));

import { Providers } from '@/components/base/providers';
import { EmbedSurface } from '@/components/base/surface';
import { STORAGE_KEY } from '@/lib/preferences';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  host.theme = 'light';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  for (const attribute of ['data-surface', 'data-theme', 'data-accent', 'data-density', 'data-display-mode']) document.documentElement.removeAttribute(attribute);
});

describe('appearance ownership', () => {
  it('keeps the initial host theme when device preferences finish loading', async () => {
    render(<Providers><EmbedSurface><p>Owned embed</p></EmbedSurface></Providers>);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(document.documentElement.getAttribute('data-surface')).toBe('embed');
  });

  it('does not let another tab’s stored preference replace a subsequent host theme', async () => {
    render(<Providers><EmbedSurface><p>Owned embed</p></EmbedSurface></Providers>);
    act(() => { host.context?.({ theme: 'dark' }); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'light' }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('delegates an unspecified host theme to the system rather than freezing a sampled system choice', async () => {
    host.theme = undefined;
    render(<Providers><EmbedSurface><p>Owned embed</p></EmbedSurface></Providers>);
    await waitFor(() => expect(document.documentElement.hasAttribute('data-theme')).toBe(false));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })); });
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('still applies the reader’s stored theme on the console', async () => {
    render(<Providers><p>Owned console</p></Providers>);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
  });
});

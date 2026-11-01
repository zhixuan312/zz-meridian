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
  document.documentElement.removeAttribute('data-platform');
  for (const name of ['--fixture-accent', '--fixture-extra', '--safe-top', '--safe-right', '--safe-bottom', '--safe-left']) document.documentElement.style.removeProperty(name);
});

describe('appearance ownership', () => {
  it('restores the document it borrowed and removes host-only styles when the embed unmounts', async () => {
    const d = document.documentElement;
    d.setAttribute('data-theme', 'dark');
    d.setAttribute('data-display-mode', 'fullscreen');
    d.setAttribute('data-platform', 'web');
    d.style.setProperty('--fixture-accent', 'red', 'important');
    d.style.setProperty('--safe-top', '7px');
    const view = render(<EmbedSurface><p>Owned embed</p></EmbedSurface>);
    await act(async () => {});
    act(() => host.context?.({ theme: 'light', displayMode: 'inline', platform: 'mobile', styles: { variables: { '--fixture-accent': 'blue', '--fixture-extra': 'green' } }, safeAreaInsets: { top: 20, right: 1, bottom: 2, left: 3 } }));
    expect(d.style.getPropertyValue('--fixture-accent')).toBe('blue');
    view.unmount();
    expect(d.getAttribute('data-theme')).toBe('dark');
    expect(d.getAttribute('data-display-mode')).toBe('fullscreen');
    expect(d.getAttribute('data-platform')).toBe('web');
    expect(d.hasAttribute('data-surface')).toBe(false);
    expect(d.style.getPropertyValue('--fixture-accent')).toBe('red');
    expect(d.style.getPropertyPriority('--fixture-accent')).toBe('important');
    expect(d.style.getPropertyValue('--fixture-extra')).toBe('');
    expect(d.style.getPropertyValue('--safe-top')).toBe('7px');
    expect(d.style.getPropertyValue('--safe-bottom')).toBe('');
  });

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

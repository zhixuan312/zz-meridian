import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/components/base/providers';
import { STORAGE_KEY } from '@/lib/preferences';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const root = () => document.documentElement;

describe('the stored appearance', () => {
  it('applies only the values it knows, and the defaults for the rest', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'neon', accent: '"><x', density: 'huge', assistant: 'yes' }));
    await act(async () => { render(<Providers><p>page</p></Providers>); });
    expect(root().getAttribute('data-theme')).not.toBe('neon');
    expect(root().getAttribute('data-accent')).not.toBe('"><x');
    expect(root().getAttribute('data-density')).toBe('comfortable');
  });
  it("reads another tab's write to its own key only, and goes back to the defaults when that tab clears it", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ density: 'compact' }));
    await act(async () => { render(<Providers><p>page</p></Providers>); });
    expect(root().getAttribute('data-density')).toBe('compact');
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'assistant.thread' })); });
    expect(reads).not.toHaveBeenCalled();
    localStorage.removeItem(STORAGE_KEY);
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })); });
    expect(root().getAttribute('data-density')).toBe('comfortable');
  });
});

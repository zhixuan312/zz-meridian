import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/b',
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';

/**
 * The marker is drawn where the current link was measured. A link moves without a navigation: the rail is resized, a
 * font arrives after first paint, a group above it changes height. The marker follows the list, not only the address
 * (issue #23).
 */
describe('the rail\'s marker', () => {
  const at = { top: 40 };
  const observers: (() => void)[] = [];
  const real = { RO: globalThis.ResizeObserver, top: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop'), height: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight') };

  beforeEach(() => {
    at.top = 40;
    observers.length = 0;
    globalThis.ResizeObserver = class { constructor(cb: () => void) { observers.push(cb); } observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get: () => at.top });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 32 });
  });
  afterEach(() => {
    globalThis.ResizeObserver = real.RO;
    if (real.top) Object.defineProperty(HTMLElement.prototype, 'offsetTop', real.top);
    if (real.height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', real.height);
  });

  const nav = [{ label: 'Group', items: [{ href: '/a', label: 'A', icon: Home, needs: 'public' as const }, { href: '/b', label: 'B', icon: Home, needs: 'public' as const }] }];
  const marker = (c: HTMLElement) => c.querySelector<HTMLElement>('nav [style*="translateY"]')?.style.transform;

  it('is measured again when the list changes size, with the address unchanged', async () => {
    let c!: HTMLElement;
    await act(async () => { c = render(<Rail nav={nav as never} user={{ name: 'Maya Chen', role: 'Owner' }} />).container; });
    expect(marker(c)).toBe('translateY(40px)');
    at.top = 96;
    await act(async () => { for (const notify of observers) notify(); });
    expect(marker(c)).toBe('translateY(96px)');
  });
});

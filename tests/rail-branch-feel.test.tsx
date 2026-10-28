import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/usage' }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Activity, BarChart3, Home } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import type { NavGroup } from '@/app.config';

type Item = NavGroup['items'][number];
const item = (href: string, label: string, icon: Item['icon'], under?: string): Item => ({ href, label, icon, needs: 'public', ...(under ? { under } : {}) });

// A navigation of this test's own, never the sample's: a created project that edits its navigation keeps this green.
const NAV: NavGroup[] = [
  { items: [item('/', 'Home', Home)] },
  { label: 'Traffic', items: [item('/usage', 'Usage', BarChart3), item('/requests', 'Requests', Activity, '/usage')] },
];
const rail = (p: string) => { at.path = p; return render(<Rail nav={NAV} user={null} />); };
const main = () => document.querySelector<HTMLElement>('nav[aria-label="Main"]')!;
const toggle = () => screen.getByRole('button', { name: 'Usage pages' });
const chevron = () => toggle().querySelector('svg')!;
const cls = (el: Element) => el.getAttribute('class') ?? '';

describe('the branch button: one motion, and focus that stays', () => {
  it('turns one chevron a quarter when the branch opens, by the hover duration, without swapping it', () => {
    rail('/usage');
    const open = chevron();
    expect(toggle().querySelectorAll('svg')).toHaveLength(1);
    expect(cls(open)).toMatch(/(^|\s)transition-transform(\s|$)/);
    expect(cls(open)).toMatch(/(^|\s)duration-\(--dur-hover\)(\s|$)/);
    expect(cls(open)).toMatch(/(^|\s)rotate-90(\s|$)/);
    fireEvent.click(toggle());
    expect(chevron()).toBe(open);
    expect(cls(chevron())).not.toMatch(/(^|\s)rotate-90(\s|$)/);
  });

  it('keeps no motion under reduced motion, through the system-wide reset', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/styles/motion.css'), 'utf8');
    const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduce).toMatch(/\*, \*::before, \*::after \{[^}]*transition-duration: 0\.01ms !important/);
  });

  it('keeps focus on the button after it closes and after it opens the branch', () => {
    rail('/usage');
    const button = toggle();
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('the marker beside a sub page: one lit line', () => {
  const notes: (() => void)[] = [];
  const props = ['offsetTop', 'offsetHeight', 'offsetLeft', 'offsetWidth'] as const;
  const realRO = globalThis.ResizeObserver;
  const real = new Map(props.map((p) => [p, Object.getOwnPropertyDescriptor(HTMLElement.prototype, p)]));
  const sub = (el: HTMLElement) => el.closest('ul ul') !== null;

  beforeEach(() => {
    notes.length = 0;
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) { notes.push(cb); }
      observe() { for (const cb of notes) queueMicrotask(cb); }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get: () => 40 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 32 });
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, get(this: HTMLElement) { return sub(this) ? 28 : 12; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get(this: HTMLElement) { return sub(this) ? 180 : 200; } });
  });
  afterEach(() => {
    globalThis.ResizeObserver = realRO;
    for (const [p, d] of real) if (d) Object.defineProperty(HTMLElement.prototype, p, d);
  });

  const marker = () => main().querySelector<HTMLElement>('[style*="translateY"]');
  /** The marker's own lit edge: an element inside it filled with the accent. */
  const edge = () => marker()?.querySelector('[class*="bg-accent"]:not([class*="bg-accent-tint"])') ?? null;

  it('draws its own lit edge over an item at the second level', async () => {
    await act(async () => { rail('/'); });
    expect(marker()).not.toBeNull();
    expect(edge()).not.toBeNull();
  });

  it('leaves the lit line to the guide beside a current sub page, and takes its edge back on the parent of a closed branch', async () => {
    await act(async () => { rail('/requests'); });
    expect(marker()).not.toBeNull();
    expect(edge()).toBeNull();
    expect(cls(main().querySelector('a[href="/requests"]')!)).toMatch(/(^|\s)before:bg-accent(\s|$)/);
    await act(async () => { fireEvent.click(toggle()); });
    await act(async () => { for (const notify of notes) notify(); });
    expect(edge()).not.toBeNull();
  });
});

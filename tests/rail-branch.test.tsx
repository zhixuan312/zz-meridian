import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/usage' }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { Activity, BarChart3, Home, KeyRound, Users } from 'lucide-react';
import { Rail } from '@/components/patterns/rail';
import type { NavGroup } from '@/app.config';

type Item = NavGroup['items'][number];
const item = (href: string, label: string, icon: Item['icon'], under?: string): Item => ({ href, label, icon, needs: 'public', ...(under ? { under } : {}) });

/**
 * A navigation of this test's own, never the sample's, so a created project that edits its navigation keeps this green:
 * Usage holds Requests and Errors, Customers holds Accounts. `drop` leaves hrefs out, as the rail is never handed a
 * destination the person may not open.
 */
const tree = (...drop: string[]): NavGroup[] => [
  { items: [item('/', 'Home', Home)] },
  {
    label: 'Traffic',
    items: [
      item('/usage', 'Usage', BarChart3),
      item('/requests', 'Requests', Activity, '/usage'),
      item('/errors', 'Errors', Activity, '/usage'),
      item('/customers', 'Customers', Users),
      item('/accounts', 'Accounts', KeyRound, '/customers'),
    ].filter((it) => !drop.includes(it.href)),
  },
];
const rail = (path: string, nav = tree()) => {
  at.path = path;
  const r = render(<Rail nav={nav} user={null} />);
  /** A navigation: the address changes and the same mounted rail draws again. */
  const go = (to: string) => { at.path = to; r.rerender(<Rail nav={nav} user={null} />); };
  return { ...r, go };
};
const main = () => document.querySelector<HTMLElement>('nav[aria-label="Main"]')!;
const link = (href: string) => main().querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
const toggle = (label: string) => screen.queryByRole('button', { name: `${label} pages` });
const press = (label: string) => fireEvent.click(toggle(label)!);
/** Whether the list a link sits in is itself inside another list. */
const nested = (href: string) => link(href)!.closest('ul')!.parentElement!.closest('ul') !== null;
const hrefs = () => [...main().querySelectorAll('a')].map((a) => a.getAttribute('href'));
const currents = () => main().querySelectorAll('[aria-current]').length;

describe('the rail with a third level: drawing', () => {
  it('draws a navigation with no under as one list per group, every link at the second level with its icon and no button', () => {
    rail('/usage', [{ items: [item('/', 'Home', Home), item('/usage', 'Usage', BarChart3), item('/requests', 'Requests', Activity)] }]);
    for (const href of ['/', '/usage', '/requests']) {
      expect(nested(href), href).toBe(false);
      expect(link(href)!.querySelector('svg'), href).not.toBeNull();
    }
    expect(main().querySelector('button')).toBeNull();
  });

  it('draws a parent as a link to its own page and a separate button that names its branch list', () => {
    rail('/usage');
    const button = toggle('Usage')!;
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(link('/usage')!.contains(button)).toBe(false);
    expect(link('/usage')!.querySelector('svg')).not.toBeNull();
    const branch = document.getElementById(button.getAttribute('aria-controls')!);
    expect(branch?.tagName).toBe('UL');
    expect(link('/usage')!.closest('li')!.contains(branch)).toBe(true);
    for (const href of ['/requests', '/errors']) {
      expect(branch!.contains(link(href)), href).toBe(true);
      expect(nested(href), href).toBe(true);
      expect(link(href)!.querySelector('svg'), href).toBeNull();
    }
    expect(toggle('Customers')).toHaveAttribute('aria-expanded', 'false');
  });

  it('names each rail\'s branch lists apart, as the desktop rail and the drawer\'s can be in the page together', () => {
    at.path = '/usage';
    render(<><Rail nav={tree()} user={null} /><Rail nav={tree()} user={null} /></>);
    const ids = screen.getAllByRole('button', { name: 'Usage pages' }).map((b) => b.getAttribute('aria-controls'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('leaves an item whose under names no item of its group at the top level, with its icon', () => {
    rail('/usage', [{ items: [item('/usage', 'Usage', BarChart3), item('/requests', 'Requests', Activity, '/nowhere')] }]);
    expect(nested('/requests')).toBe(false);
    expect(link('/requests')!.querySelector('svg')).not.toBeNull();
    expect(toggle('Usage')).toBeNull();
  });
});

describe('the rail with a third level: which branches are open', () => {
  it('opens on arrival the branch that holds the current page, on a sub page and on the parent\'s own page, and starts every other closed', () => {
    const r = rail('/requests');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Customers')).toHaveAttribute('aria-expanded', 'false');
    r.unmount();
    rail('/customers');
    expect(toggle('Customers')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps a branch the person opened, and the one opened on arrival, open across a navigation elsewhere', () => {
    const r = rail('/requests');
    press('Customers');
    expect(link('/accounts')).not.toBeNull();
    r.go('/');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Customers')).toHaveAttribute('aria-expanded', 'true');
    expect(link('/requests')).not.toBeNull();
    expect(link('/accounts')).not.toBeNull();
  });

  it('keeps a branch closed while inside it closed until a navigation lands inside it again', () => {
    const r = rail('/requests');
    press('Usage');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'false');
    r.go('/requests');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'false');
    r.go('/');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'false');
    r.go('/errors');
    expect(toggle('Usage')).toHaveAttribute('aria-expanded', 'true');
    expect(link('/errors')).not.toBeNull();
  });

  it('mounts none of a closed branch\'s links', () => {
    rail('/');
    expect(hrefs()).toEqual(['/', '/usage', '/customers']);
    expect(main().textContent).not.toMatch(/Requests|Errors|Accounts/);
  });
});

describe('the rail with a third level: the current page', () => {
  it('marks a parent\'s own page as the page, with its branch open or closed, and nothing else', () => {
    rail('/usage');
    expect(link('/usage')).toHaveAttribute('aria-current', 'page');
    expect(currents()).toBe(1);
    expect(main().querySelectorAll('[data-holds]')).toHaveLength(0);
    press('Usage');
    expect(link('/usage')).toHaveAttribute('aria-current', 'page');
    expect(currents()).toBe(1);
  });

  it('marks the current sub page as the page, and its open branch\'s parent as holding it, without a current of its own', () => {
    rail('/requests');
    expect(link('/requests')).toHaveAttribute('aria-current', 'page');
    expect(link('/usage')).not.toHaveAttribute('aria-current');
    expect(link('/usage')).toHaveAttribute('data-holds');
    expect(main().querySelectorAll('[data-holds]')).toHaveLength(1);
    expect(currents()).toBe(1);
  });

  it('marks the parent of a closed branch that holds the current page as the current location', () => {
    rail('/requests');
    press('Usage');
    expect(link('/requests')).toBeNull();
    expect(link('/usage')).toHaveAttribute('aria-current', 'true');
    expect(link('/usage')).not.toHaveAttribute('data-holds');
    expect(currents()).toBe(1);
  });
});

describe('the rail with a third level: what the person may open', () => {
  it('draws a parent with no sub page the person may open as an ordinary item, with no button', () => {
    rail('/usage', tree('/requests', '/errors'));
    expect(toggle('Usage')).toBeNull();
    expect(link('/usage')!.querySelector('svg')).not.toBeNull();
    expect(toggle('Customers')).not.toBeNull();
  });

  it('draws no sub page the person may not open', () => {
    rail('/usage', tree('/errors'));
    expect(link('/errors')).toBeNull();
    expect(nested('/requests')).toBe(true);
  });

  it('draws a sub page whose parent the person may not open as an ordinary item of its group, with its own icon, where the parent would be', () => {
    rail('/requests', tree('/usage'));
    expect(toggle('Usage')).toBeNull();
    expect(hrefs()).toEqual(['/', '/requests', '/errors', '/customers']);
    for (const href of ['/requests', '/errors']) {
      expect(nested(href), href).toBe(false);
      expect(link(href)!.querySelector('svg'), href).not.toBeNull();
      expect(link(href)!.closest('ul'), href).toBe(link('/customers')!.closest('ul'));
    }
    expect(link('/requests')).toHaveAttribute('aria-current', 'page');
  });
});

describe('the rail with a third level: under a coarse pointer', () => {
  it('gives every parent, sub page and button row a 44px row', () => {
    rail('/requests');
    // Every link of the rail, the parent's and the sub page's, takes the coarse row from the nav's own rule.
    expect(main().className).toMatch(/(^|\s)pointer-coarse:\[&_a\]:h-11(\s|$)/);
    expect(toggle('Usage')!.className).toMatch(/(^|\s)pointer-coarse:size-11(\s|$)/);
    // Nothing inside the branch sets its links a height of its own without the coarse row beside it.
    const branch = document.getElementById(toggle('Usage')!.getAttribute('aria-controls')!)!;
    for (const el of [branch, ...branch.querySelectorAll('li, a')]) {
      const cls = el.getAttribute('class') ?? '';
      if (/(^|\s)(\[&_a\]:)?h-(?!11(\s|$))[\d.]+(\s|$)/.test(cls)) expect(cls, el.tagName).toMatch(/(^|\s)pointer-coarse:(\[&_a\]:)?h-11(\s|$)/);
    }
  });
});

/**
 * The marker is drawn over the current link's own box. A branch that opens or closes moves the links below it without
 * resizing the scrolling nav, so the rail observes the content inside it as well (CS-3). The fake observer answers
 * `observe` after the effect that called it, as the platform does.
 */
describe('the rail with a third level: the marker', () => {
  const observed: Element[] = [];
  const notes: (() => void)[] = [];
  const props = ['offsetTop', 'offsetHeight', 'offsetLeft', 'offsetWidth'] as const;
  const realRO = globalThis.ResizeObserver;
  const real = new Map(props.map((p) => [p, Object.getOwnPropertyDescriptor(HTMLElement.prototype, p)]));
  /** A sub page sits 28px in and is 180px wide; a link at the second level sits 12px in and is 200px wide. */
  const sub = (el: HTMLElement) => el.closest('ul ul') !== null;

  beforeEach(() => {
    observed.length = 0;
    notes.length = 0;
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) { notes.push(cb); }
      observe(el: Element) { observed.push(el); for (const cb of notes) queueMicrotask(cb); }
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

  it('observes the content inside the scrolling nav, so a branch that opens or closes is measured again', async () => {
    await act(async () => { rail('/usage'); });
    expect(observed.some((el) => el !== main() && main().contains(el) && el.contains(link('/')) && el.contains(link('/customers')))).toBe(true);
  });

  it('is drawn over the current sub page\'s own box, and over its parent once the branch is closed', async () => {
    await act(async () => { rail('/requests'); });
    expect(marker()?.style.left).toBe('28px');
    expect(marker()?.style.width).toBe('180px');
    await act(async () => { press('Usage'); });
    await act(async () => { for (const notify of notes) notify(); });
    expect(marker()?.style.left).toBe('12px');
    expect(marker()?.style.width).toBe('200px');
  });
});

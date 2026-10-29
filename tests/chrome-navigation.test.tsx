import { act, render, screen, within } from '@testing-library/react';
import { Home, Package, Wrench } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { nav, type NavGroup } from '@/app.config';
import { openCommand } from '@/components/patterns/command-palette';
import type { ChromeAccess } from '@/lib/collection';
import { ConsolePalette, ConsoleRail, visible } from '@/views/console-chrome';

/** A navigation that is not the configured one: its own groups in its own order, sharing one address with it. */
const own: NavGroup[] = [
  { items: [{ href: '/', label: 'Home', icon: Home, needs: 'public' }] },
  {
    label: 'Workshop',
    items: [
      { href: '/jobs', label: 'Jobs', icon: Wrench, needs: 'public' },
      { href: '/parts', label: 'Parts', icon: Package, needs: 'public' },
    ],
  },
];
const person = { name: 'Dana Ortiz', role: 'Admin' };
const hrefs = (groups: NavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.href));
const links = () => screen.queryAllByRole('link').map((l) => l.textContent);

describe('the navigation the chrome is given', () => {
  it('is the configured one when none is supplied', () => {
    expect(visible()).toBe(nav);
    const two = hrefs(nav).slice(0, 2);
    expect(hrefs(visible(two))).toEqual(two);
  });

  it('keeps a supplied navigation in its own groups and order, and shows only what the person may open', () => {
    expect(visible(undefined, own)).toEqual(own);
    const some = visible(['/parts', '/', '/members'], own);
    expect(hrefs(some)).toEqual(['/', '/parts']);
    expect(some.map((g) => g.label)).toEqual([undefined, 'Workshop']);
  });

  it('drops a group left with nothing, and never falls back to the configured navigation', () => {
    expect(visible(['/'], own).map((g) => g.label)).toEqual([undefined]);
    expect(visible(['/members'], own)).toEqual([]);
    expect(visible(undefined, [])).toEqual([]);
    expect(visible(['/'], [])).toEqual([]);
  });
});

describe("the console's rail and palette, given a navigation", () => {
  it('draw it in place of the configured one', async () => {
    await act(async () => { render(<ConsoleRail signOut={null} nav={own} />); });
    expect(links()).toEqual(['Home', 'Jobs', 'Parts']);
  });

  it('draw none of it until access resolves, then only what the person may open', async () => {
    let settle!: (access: ChromeAccess | null) => void;
    const access = new Promise<ChromeAccess | null>((resolve) => { settle = resolve; });
    await act(async () => { render(<ConsoleRail signOut={null} nav={own} access={access} />); });
    expect(links()).toEqual([]);
    await act(async () => { settle({ only: ['/', '/jobs', '/members'], user: person }); });
    expect(await screen.findByText('Dana Ortiz')).toBeTruthy();
    expect(links()).toEqual(['Home', 'Jobs']);
  });

  it('draw none of it for an identity that cannot be resolved', async () => {
    await act(async () => { render(<ConsoleRail signOut={null} nav={own} access={Promise.resolve(null)} />); });
    await act(async () => { await Promise.resolve(); });
    expect(links()).toEqual([]);
    expect(screen.queryByText('Dana Ortiz')).toBeNull();
  });

  it('offer the same destinations in the palette as in the rail', async () => {
    const access = Promise.resolve<ChromeAccess | null>({ only: ['/jobs', '/parts'], user: person });
    await act(async () => {
      render(
        <>
          <ConsoleRail signOut={null} nav={own} access={access} />
          <ConsolePalette nav={own} access={access} />
        </>,
      );
    });
    expect(await screen.findByText('Dana Ortiz')).toBeTruthy();
    expect(links()).toEqual(['Jobs', 'Parts']);
    act(() => openCommand());
    const options = within(await screen.findByRole('dialog')).getAllByRole('option').map((o) => o.textContent ?? '');
    expect(options.filter((o) => o.endsWith('Workshop'))).toEqual(['JobsWorkshop', 'PartsWorkshop']);
    // Nothing of the configured navigation, whatever it holds, beyond the two this person may open of their own.
    const configured = nav.flatMap((g) => g.items.map((i) => i.label)).filter((l) => !['Jobs', 'Parts'].includes(l));
    expect(options.filter((o) => configured.some((l) => o.startsWith(l)))).toEqual([]);
  });

  it('offers an empty supplied navigation as empty, in both', async () => {
    await act(async () => {
      render(
        <>
          <ConsoleRail signOut={null} nav={[]} />
          <ConsolePalette nav={[]} />
        </>,
      );
    });
    expect(links()).toEqual([]);
    act(() => openCommand());
    const options = within(await screen.findByRole('dialog')).getAllByRole('option').map((o) => o.textContent ?? '');
    expect(options.some((o) => /^(Home|Requests|Settings)/.test(o))).toBe(false);
  });
});

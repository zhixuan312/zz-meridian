import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/', pushed: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { at.pushed.push(to); }, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { nav, workspaces } from '@/app.config';
import type { ChromeAccess } from '@/lib/collection';
import { ConsoleRail, RailPending } from '@/views/console-chrome';
import { WorkspaceRail } from '@/views/workspace-chrome';
import { navOf } from '@/views/workspaces';

/**
 * The workspace menu offers only where a person may go (issue #25). A workspace decides nothing about access, so the
 * menu reads what the rail reads: the destinations this person may open. The sample's own roles leave every persona
 * something in each workspace, so these people are made here.
 */
const EVERY = nav.flatMap((g) => g.items).map((i) => i.href);
const hrefs = (id: keyof typeof workspaces) => navOf(id).flatMap((g) => g.items).map((i) => i.href);
const person = { name: 'Noor Haddad', role: 'Member' };
const may = (only: string[]): Promise<ChromeAccess | null> => Promise.resolve({ only, user: person });
const rail = async (pathname: string, access: Promise<ChromeAccess | null>) => {
  at.path = pathname;
  await act(async () => { render(<WorkspaceRail access={access} />); });
  await screen.findByText('Noor Haddad');
};
const offered = async () => {
  fireEvent.keyDown(screen.getByRole('button', { name: /: workspace menu$/ }), { key: 'Enter' });
  return within(await screen.findByRole('menu')).getAllByRole('menuitemradio');
};

beforeEach(() => { at.path = '/'; at.pushed.length = 0; });

describe('the workspace menu, for a person who may open nothing in a workspace', () => {
  it('does not offer that workspace', async () => {
    await rail('/', may(EVERY.filter((href) => !hrefs('engineering').includes(href))));
    expect((await offered()).map((s) => s.textContent)).toEqual(['Main', 'Business']);
  });

  it('is the account menu, with nothing to switch between, when one workspace is left', async () => {
    await rail('/', may(hrefs('main')));
    expect(screen.queryByRole('button', { name: /: workspace menu$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /: account menu$/ })).toBeTruthy();
  });
});

describe('choosing a workspace whose home the person may not open', () => {
  it('opens the first of its destinations they may', async () => {
    const [home, next] = hrefs('engineering');
    expect(home).toBe(workspaces.engineering.homeHref);
    await rail('/', may(EVERY.filter((href) => href !== home)));
    const scopes = await offered();
    await act(async () => { fireEvent.click(scopes.find((s) => s.textContent === 'Engineering')!); });
    expect(at.pushed).toEqual([next]);
  });

  it('still opens the home when they may', async () => {
    await rail('/', may(EVERY));
    const scopes = await offered();
    await act(async () => { fireEvent.click(scopes.find((s) => s.textContent === 'Business')!); });
    expect(at.pushed).toEqual([workspaces.business.homeHref]);
  });
});

/**
 * A product that learns who is signed in in the browser has no promise for the server to resolve (issue #24). The rail
 * takes the value itself, and the frame it holds while waiting is exported for the product to hold meanwhile.
 */
describe('the console rail, given who is signed in as a value', () => {
  it('draws that person\'s destinations at once, with no boundary to wait behind', () => {
    render(<ConsoleRail access={{ only: ['/'], user: person }} />);
    expect(screen.getByText('Noor Haddad')).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/']);
  });

  it('draws nobody and no destination for a value of null', () => {
    render(<ConsoleRail access={null} />);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });

  it('exports the frame it holds while waiting, which names no destination', () => {
    const { container } = render(<RailPending />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('a').length).toBe(0);
  });
});

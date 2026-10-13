import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/', pushed: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { at.pushed.push(to); }, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { app, nav } from '@/app.config';
import { openCommand } from '@/components/patterns/command-palette';
import type { ChromeAccess } from '@/lib/collection';
import { WorkspacePalette, WorkspaceRail } from '@/views/workspace-chrome';

const ROOT = path.resolve(import.meta.dirname, '..');
/**
 * The template's own repository keeps the Atlas. A project made by `create` has it removed (`scripts/brand.ts` deletes
 * `app/system`), and the two entries that lead there go with it: the same declaration then holds thirteen destinations.
 */
const ATLAS = fs.existsSync(path.join(ROOT, 'app/system')) ? ['Design system', 'Docs'] : [];
/** Main's entries as the rail draws them, and the menu's name: the product's own name, then the workspace in view. */
const MAIN = ['Overview', 'Members', 'Settings', ...ATLAS];
const menuOf = (workspace: string) => `${app.name}, ${workspace}: workspace menu`;
const EVERY = nav.flatMap((g) => g.items).map((i) => i.href);
const person = { name: 'Maya Chen', role: 'Owner' };
const everything = (): Promise<ChromeAccess | null> => Promise.resolve({ only: EVERY, user: person });
const viewer = (): Promise<ChromeAccess | null> => Promise.resolve({ only: EVERY.filter((href) => href !== '/members' && href !== '/keys'), user: { name: 'Grace Liu', role: 'Viewer' } });
const links = () => within(screen.getByRole('navigation', { name: 'Main' })).queryAllByRole('link').map((l) => l.textContent);
const trigger = () => screen.getByRole('button', { name: /: workspace menu$/ });
const rail = async (pathname: string, access = everything()) => {
  at.path = pathname;
  await act(async () => { render(<WorkspaceRail access={access} />); });
  await screen.findByText(/Maya Chen|Grace Liu/);
};

beforeEach(() => { at.path = '/'; at.pushed.length = 0; });

describe('the rail, wherever the address is', () => {
  it('draws Main at the home address', async () => {
    await rail('/');
    expect(links()).toEqual(MAIN);
    expect(trigger().getAttribute('aria-label')).toBe(menuOf('Main'));
  });

  it('draws Business on a request\'s own page, with Requests as the current entry', async () => {
    await rail('/requests/req_1');
    expect(links()).toEqual(['Revenue', 'Analytics', 'Customers', 'Requests']);
    expect(trigger().getAttribute('aria-label')).toBe(menuOf('Business'));
    expect(screen.getByRole('link', { name: 'Requests' }).getAttribute('aria-current')).toBe('page');
  });

  it('draws Engineering on its pages', async () => {
    await rail('/operations-tickets');
    expect(links()).toEqual(['Now', 'Operations', 'API keys', 'Operations tickets', 'Tests and verification', 'Releases']);
    expect(trigger().getAttribute('aria-label')).toBe(menuOf('Engineering'));
  });

  it('draws Main for an address no entry owns', async () => {
    await rail('/nowhere');
    expect(links()).toEqual(MAIN);
  });
});

describe('the rail, for a person who may not open everything', () => {
  it('leaves out what they may not open, in every workspace, and still offers all three', async () => {
    await rail('/health', viewer());
    expect(links()).toEqual(['Now', 'Operations', 'Operations tickets', 'Tests and verification', 'Releases']);
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(within(await screen.findByRole('menu')).getAllByRole('menuitemradio').map((r) => r.textContent)).toEqual(['Main', 'Business', 'Engineering']);
  });

  it('draws no destination while who they are is still being found out, and none when it cannot be', async () => {
    at.path = '/analytics';
    let settle!: (access: ChromeAccess | null) => void;
    await act(async () => { render(<WorkspaceRail access={new Promise<ChromeAccess | null>((resolve) => { settle = resolve; })} />); });
    expect(screen.queryAllByRole('link')).toEqual([]);
    await act(async () => { settle(null); });
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});

describe('choosing a workspace', () => {
  const choose = async (label: string) => {
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    const scopes = within(menu).getAllByRole('menuitemradio');
    const checked = scopes.filter((s) => s.getAttribute('aria-checked') === 'true').map((s) => s.textContent);
    await act(async () => { fireEvent.click(scopes.find((s) => s.textContent === label)!); });
    return checked;
  };

  it('goes to that workspace\'s home, and the check is on the workspace the address is in', async () => {
    await rail('/customers');
    expect(await choose('Engineering')).toEqual(['Business']);
    expect(at.pushed).toEqual(['/engineering']);
  });

  it('goes nowhere when it is the workspace already in view: the page and its filters stay', async () => {
    await rail('/requests/req_1');
    expect(await choose('Business')).toEqual(['Business']);
    expect(at.pushed).toEqual([]);
  });
});

describe('the palette', () => {
  it('offers the destinations the rail offers, for the same person at the same address', async () => {
    at.path = '/tests';
    const access = viewer();
    await act(async () => { render(<><WorkspaceRail access={access} /><WorkspacePalette access={access} /></>); });
    await screen.findByText('Grace Liu');
    // Read the rail first: the open palette is a modal, and what is behind a modal is hidden from every reader.
    const offered = links();
    act(() => openCommand());
    const options = within(await screen.findByRole('dialog')).getAllByRole('option').map((o) => o.textContent ?? '');
    expect(offered).toEqual(['Now', 'Operations', 'Operations tickets', 'Tests and verification', 'Releases']);
    for (const label of offered) expect(options.some((o) => o.startsWith(label!)), label!).toBe(true);
    for (const label of ['Overview', 'Analytics', 'Customers', 'API keys', 'Members']) expect(options.some((o) => o.startsWith(label)), label).toBe(false);
  });
});

describe('the product\'s shell', () => {
  it('hands the rail and the palette one access, and keeps the workspace nowhere but the address', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/(dashboard)/layout.tsx'), 'utf8');
    expect(layout).toMatch(/<WorkspaceRail access=\{access\}/);
    expect(layout).toMatch(/<WorkspacePalette access=\{access\}/);
    // The adapter as code: what its comments say is not what it does.
    const adapter = fs.readFileSync(path.join(ROOT, 'src/views/workspace-chrome.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(adapter).toMatch(/usePathname\(\)/);
    expect(adapter).not.toMatch(/cookie|localStorage|sessionStorage|useSearchParams|useState/i);
  });
});

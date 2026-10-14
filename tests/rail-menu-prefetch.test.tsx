import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ pushed: [] as string[], prefetched: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { at.pushed.push(to); }, prefetch: (to: string) => { at.prefetched.push(to); }, replace() {}, refresh() {}, back() {}, forward() {} }),
}));

import { House } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { Rail, type Scope } from '@/components/patterns/rail';

const NAV: NavGroup[] = [{ label: 'Workspace', items: [{ href: '/', label: 'Home', icon: House, needs: 'public' }] }];
/** Three workspaces of a product, each opening its own page; one is in view, one goes to no page of its own. */
const scopes = (): Scope[] => [
  { id: 'main', label: 'Main', active: true, href: '/', onSelect: () => {} },
  { id: 'fleet', label: 'Fleet', active: false, href: '/vessels', onSelect: () => at.pushed.push('/vessels') },
  { id: 'elsewhere', label: 'Elsewhere', active: false, onSelect: () => {} },
];
const trigger = () => screen.getByRole('button', { name: /: workspace menu$/ });

beforeEach(() => { at.pushed.length = 0; at.prefetched.length = 0; });

/**
 * A workspace's row is a press, not a link, so nothing prefetches where it goes while the menu is closed; a phone's
 * closed drawer prefetches nothing at all. Opening the menu is the person's intent, so each other row's page is
 * prefetched then, as the drawer's links are when it opens, and the press that follows finds the page ready.
 */
describe("the rail's workspace menu", () => {
  it('prefetches the page each other workspace opens when it opens, and not before', () => {
    render(<Rail nav={NAV} current="/" user={{ name: 'Ada Park', role: 'Owner' }} scopes={scopes()} workspace="Main" />);
    expect(at.prefetched).toEqual([]);
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(at.prefetched).toEqual(['/vessels']);
  });

  it('still runs the row chosen', () => {
    render(<Rail nav={NAV} current="/" user={{ name: 'Ada Park', role: 'Owner' }} scopes={scopes()} workspace="Main" />);
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'Fleet' }));
    expect(at.pushed).toEqual(['/vessels']);
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ pushed: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { at.pushed.push(to); }, prefetch() {}, replace() {}, refresh() {}, back() {}, forward() {} }),
}));

import { House } from 'lucide-react';
import type { NavGroup } from '@/app.config';
import { THREAD_KEY } from '@/components/patterns/assistant/thread';
import { Rail } from '@/components/patterns/rail';

const NAV: NavGroup[] = [{ label: 'Workspace', items: [{ href: '/', label: 'Home', icon: House, needs: 'public' }] }];
const signOut = () => {
  fireEvent.keyDown(screen.getByRole('button', { name: /: (workspace|account) menu$/ }), { key: 'Enter' });
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Sign out' }));
};

beforeEach(() => { at.pushed.length = 0; localStorage.clear(); });

/**
 * The assistant's conversation is the signed-in person's (issue #39). Signing out removes it from the browser, so the
 * next person to sign in there neither sees it nor sends it with their first question, whatever Sign out then does.
 */
describe('Sign out', () => {
  it('removes the assistant conversation before it goes to its route', () => {
    localStorage.setItem(THREAD_KEY, '{"v":2,"scope":"t/a","messages":[]}');
    render(<Rail nav={NAV} current="/" user={{ name: 'Ada Park', role: 'Owner' }} signOut="/sign-in" />);
    signOut();
    expect(localStorage.getItem(THREAD_KEY)).toBeNull();
    expect(at.pushed).toEqual(['/sign-in']);
  });

  it('removes it before a product sign-out function runs', () => {
    localStorage.setItem(THREAD_KEY, '{"v":2,"scope":"t/a","messages":[]}');
    const seen: (string | null)[] = [];
    render(<Rail nav={NAV} current="/" user={{ name: 'Ada Park', role: 'Owner' }} signOut={() => seen.push(localStorage.getItem(THREAD_KEY))} />);
    signOut();
    expect(seen).toEqual([null]);
  });
});

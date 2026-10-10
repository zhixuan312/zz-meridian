// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const spy = vi.hoisted(() => ({ reads: [] as string[], redirected: [] as string[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
// The App Router's hooks are replaced wholesale, never spread: spreading the real module would restore Next's own
// useRouter and every client view rendered here would fail before its assertions.
vi.mock('next/navigation', () => ({
  usePathname: () => '/keys',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { spy.redirected.push(url); throw new Error(`redirect ${url}`); },
}));
// The sample's Viewer reads every dashboard, so no persona is denied the overview, the analytics or a request detail.
// The spec's partial fixture is what makes those refusals reachable: a policy holding only `days:read`. `effective` is
// replaced alongside the table, because overriding a module's export does not rebind what its neighbours closed over —
// and the production union rule stays in roles.ts, where it belongs.
vi.mock('@/data/roles', async (orig) => {
  const real = await orig<typeof import('@/data/roles')>();
  const GRANTS = { ...real.GRANTS, Viewer: ['days:read'] } as unknown as typeof real.GRANTS;
  const effective = (role: Parameters<typeof real.effective>[0], addOns: Parameters<typeof real.effective>[1]) =>
    new Set([...GRANTS[role], ...addOns.flatMap((addOn) => GRANTS[addOn])]);
  return { ...real, GRANTS, effective };
});
vi.mock('@/data/read', async (orig) => {
  const real = await orig<typeof import('@/data/read')>();
  return { ...real, read: async (name: string, q?: unknown) => { spy.reads.push(name); return real.read(name, q as never); } };
});

import OverviewPage from '../app/(dashboard)/(overview)/page';
import AnalyticsPage from '../app/(dashboard)/analytics/page';
import KeysPage from '../app/(dashboard)/keys/page';
import MembersPage from '../app/(dashboard)/members/page';
import { generateMetadata } from '../app/(dashboard)/requests/[id]/page';

beforeEach(() => { jar.value = undefined; spy.reads.length = 0; spy.redirected.length = 0; });

const markup = async (page: () => Promise<unknown>) => renderToStaticMarkup((await page()) as never);

describe('a page a person may not open', () => {
  it('answers NoAccess to a Viewer without reading anything', async () => {
    jar.value = 'members_12';
    expect(await markup(KeysPage)).toContain('data-no-access');
    expect(await markup(MembersPage)).toContain('data-no-access');
    // The keys and members readers were never reached: the check comes first.
    expect(spy.reads.filter((n) => n === 'keys' || n === 'members')).toEqual([]);
  });

  it('refuses a days-only policy at Overview and Analytics before any protected read', async () => {
    jar.value = 'members_12';
    expect(await markup(OverviewPage)).toContain('data-no-access');
    expect(await markup(AnalyticsPage)).toContain('data-no-access');
    expect(spy.reads).toEqual([]);
  });

  it('sends a person with no session to sign-in before any read', async () => {
    jar.value = 'members_999';
    await expect(KeysPage()).rejects.toThrow('redirect /sign-in');
    expect(spy.reads).toEqual([]);
  });

  it('reads the page for the person who may open it', async () => {
    jar.value = 'members_1';
    expect(await markup(KeysPage)).not.toContain('data-no-access');
    expect(spy.reads).toContain('keys');
  });

  it('answers the feature title in the metadata of a denied request, without reading the record', async () => {
    jar.value = 'members_12';
    expect(await generateMetadata({ params: Promise.resolve({ id: 'req_1' }) })).toEqual({ title: 'Request' });
    expect(spy.reads).toEqual([]);
  });
});

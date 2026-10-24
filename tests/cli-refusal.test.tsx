// Named cli-* so the payload leaves it out: it reads the sample's personas and pages, which a product replaces.
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const at = vi.hoisted(() => ({ path: '/' }));
const policy = vi.hoisted(() => ({ refusal: 'explain' as 'explain' | 'absent' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
  notFound: () => { throw new Error('not found'); },
}));
// The product's choice, read where it is used: the sample declares `explain`, and a case here declares `absent`.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, get refusal() { return policy.refusal; } };
});

import * as config from '@/app.config';
import { FEATURES } from '@/data/features';
import { gate, gatedMetadata } from '@/data/access';
import { MissingPage } from '@/views/missing-page';
import { NOT_FOUND } from '@/views/not-found';
import { renderRefusal } from '@/views/refusal';
import * as dashboardNotFound from '../app/(dashboard)/not-found';
import * as keysPage from '../app/(dashboard)/keys/page';
import * as membersPage from '../app/(dashboard)/members/page';

const OWNER = 'members_1';
const VIEWER = 'members_12';
const html = (node: React.ReactNode) => renderToStaticMarkup(<Tooltip.Provider>{node}</Tooltip.Provider>);
const textOf = (markup: string) => new DOMParser().parseFromString(markup, 'text/html').body.textContent ?? '';

beforeEach(() => { jar.value = VIEWER; at.path = '/'; policy.refusal = 'explain'; });

describe('what an address a person may not open answers', () => {
  it('the sample declares explain', async () => {
    const real = await vi.importActual<typeof import('@/app.config')>('@/app.config');
    expect(real.refusal).toBe('explain');
    expect(config.refusal).toBe('explain');
  });

  it("under explain, today's page: it says the page exists and how to reach it", async () => {
    at.path = '/members';
    const denied = await gate('members');
    expect(denied).not.toBeNull();
    const markup = html(await renderRefusal(denied!));
    expect(markup).toContain('data-no-access');
    expect(textOf(markup)).toContain(FEATURES.members.title);
  });

  // A refused address is a route the console matches, so it draws the console's missing page, in the shell and at 200,
  // as an address inside the console that names nothing does; an unmatched URL's standalone 404 is not open to it.
  it("under absent, exactly the console's missing page an address that names nothing draws", async () => {
    policy.refusal = 'absent';
    at.path = '/members';
    const denied = await gate('members');
    expect(denied).not.toBeNull();
    const refused = html(await renderRefusal(denied!));
    at.path = '/nothing-lives-here';
    const missing = html(<MissingPage />);
    // The address is written whole in a link's label and, below the root, in two pieces: a link and the part that leads nowhere.
    expect(refused.replaceAll('/members', '/nothing-lives-here').replaceAll('>members<', '>nothing-lives-here<')).toBe(missing);
    const text = textOf(refused);
    expect(text).toContain(NOT_FOUND.sentence.replace(/\.$/, ''));
    expect(refused).not.toContain('data-no-access');
    for (const word of [FEATURES.members.title, 'Owner', 'Admin', 'Ask ']) expect(text, word).not.toContain(word);
  });

  it('under absent, a page the person may open is unchanged', async () => {
    policy.refusal = 'absent';
    expect(await gate('tickets')).toBeNull();
    jar.value = OWNER;
    expect(await gate('members')).toBeNull();
  });
});

describe('the title a refused address carries', () => {
  it('gatedMetadata: the missing page\'s title under absent for a person who may not open it, the page\'s own otherwise', async () => {
    const own = { title: FEATURES.keys.title };
    expect((await gatedMetadata('keys', own)).title).toBe(own.title);
    policy.refusal = 'absent';
    const refused = await gatedMetadata('keys', own);
    expect(refused.title).toBe(dashboardNotFound.metadata.title);
    expect(refused.robots).toMatchObject({ index: false });
    jar.value = OWNER;
    expect((await gatedMetadata('keys', own)).title).toBe(own.title);
  });

  it('API keys and Members are titled through it, so a Viewer under absent reads "Not found" in the tab', async () => {
    for (const page of [keysPage, membersPage] as const) {
      expect('metadata' in page, 'a static title would name the page to anyone').toBe(false);
      const meta = (page as unknown as { generateMetadata: () => Promise<{ title?: unknown }> }).generateMetadata;
      policy.refusal = 'explain';
      expect((await meta()).title).not.toBe('Not found');
      policy.refusal = 'absent';
      expect((await meta()).title).toBe('Not found');
    }
  });
});

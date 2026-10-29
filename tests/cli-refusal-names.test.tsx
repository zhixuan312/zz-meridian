// Named cli-* so the payload leaves it out: it renders the sample's own loading states and missing page, which a product replaces.
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const at = vi.hoisted(() => ({ path: '/' }));
const policy = vi.hoisted(() => ({ refusal: 'explain' as 'explain' | 'absent' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
  notFound: () => { throw new Error('not found'); },
}));
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, get refusal() { return policy.refusal; } };
});

import { FEATURES, type FeatureId } from '@/data/features';
import { SERVICES_LINE } from '@/logic/services-context';
import HomeLoading from '../app/(dashboard)/(home)/loading';
import RevenueLoading from '../app/(dashboard)/business/loading';
import CustomerLoading from '../app/(dashboard)/customers/[id]/loading';
import CustomersLoading from '../app/(dashboard)/customers/loading';
import NowLoading from '../app/(dashboard)/engineering/loading';
import KeysLoading from '../app/(dashboard)/keys/loading';
import MembersLoading from '../app/(dashboard)/members/loading';
import TicketsLoading from '../app/(dashboard)/operations-tickets/loading';
import ReleasesLoading from '../app/(dashboard)/releases/loading';
import RequestLoading from '../app/(dashboard)/requests/[id]/loading';
import RequestsLoading from '../app/(dashboard)/requests/loading';
import ServicesLoading from '../app/(dashboard)/services/loading';
import SettingsLoading from '../app/(dashboard)/settings/loading';
import TestsLoading from '../app/(dashboard)/tests/loading';
import UsageLoading from '../app/(dashboard)/usage/loading';
import RootNotFound from '../app/not-found';
import { servedDocument, textOf } from './served';

const OWNER = 'members_1';
const VIEWER = 'members_12';

/** What a reader meets: the text, one node from the next by a space and every run of spaces as one, and every label a screen reader or a tooltip reads out. */
function said(doc: Document): { text: string; labels: string } {
  const labels = [...doc.querySelectorAll('[aria-label], [title]')].map((el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''}`);
  return { text: textOf(doc).replace(/\s+/g, ' '), labels: labels.join(' ') };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whether a page's name is said: as a word of the text, or in any case inside a label ("Loading members"). */
const names = (doc: Document, word: string) => {
  const { text, labels } = said(doc);
  return new RegExp(`\\b${escape(word)}\\b`).test(text) || new RegExp(`\\b${escape(word)}\\b`, 'i').test(labels);
};

/** Every gated route's loading state, with the feature it waits for and any line of its own that names the page. */
const LOADING: [string, () => ReactElement, FeatureId, string[]][] = [
  ['/', HomeLoading, 'home', []],
  ['/business', RevenueLoading, 'revenue', []],
  ['/customers/<id>', CustomerLoading, 'customer', ['Customers', 'Business']],
  ['/customers', CustomersLoading, 'customers', []],
  ['/engineering', NowLoading, 'now', []],
  ['/keys', KeysLoading, 'keys', []],
  ['/members', MembersLoading, 'members', []],
  ['/operations-tickets', TicketsLoading, 'tickets', []],
  ['/releases', ReleasesLoading, 'releases', []],
  ['/requests/<id>', RequestLoading, 'request', []],
  ['/requests', RequestsLoading, 'requests', []],
  ['/services', ServicesLoading, 'services', [SERVICES_LINE]],
  ['/settings', SettingsLoading, 'settings', []],
  ['/tests', TestsLoading, 'tests', []],
  ['/usage', UsageLoading, 'usage', []],
];

beforeEach(() => { jar.value = VIEWER; at.path = '/'; policy.refusal = 'explain'; });

describe('a loading state, which is drawn before the gate has answered and so for anyone', () => {
  it('under explain, names its page as today', async () => {
    for (const [route, Loading, feature] of LOADING) expect(names(await servedDocument(<Loading />), FEATURES[feature].title), route).toBe(true);
  });

  it('under absent, names no page: neither its title nor its name, nor a line of its own', async () => {
    policy.refusal = 'absent';
    for (const [route, Loading, feature, own] of LOADING) {
      const doc = await servedDocument(<Loading />);
      for (const word of [FEATURES[feature].title, ...own]) expect(names(doc, word), `${route}: ${word}`).toBe(false);
    }
  });
});

describe('an address below a page the person may not open, which no route matches', () => {
  it('under explain, walks back to the page as today', async () => {
    at.path = '/keys/anything';
    expect(said(await servedDocument(RootNotFound())).text).toContain(`${FEATURES.keys.title} is still here`);
  });

  it('under absent, walks back past it for a Viewer, and names it to an Owner, who may open it', async () => {
    policy.refusal = 'absent';
    at.path = '/keys/anything';
    const viewer = said(await servedDocument(RootNotFound()));
    expect(viewer.text).not.toContain(FEATURES.keys.title);
    expect(viewer.labels).not.toContain(FEATURES.keys.title);
    expect(viewer.text).toContain('No page in');
    jar.value = OWNER;
    expect(said(await servedDocument(RootNotFound())).text).toContain(`${FEATURES.keys.title} is still here`);
  });
});

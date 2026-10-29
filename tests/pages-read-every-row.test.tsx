// @vitest-environment node
/**
 * What a page hands its view is what a person sees. Each page below reads a collection a workspace can grow past a
 * read's page — API keys and members are both created through the product itself — and every one of them says "every".
 *
 * The view is replaced by a counter, so the page is the thing under test and not a copy of it: a test that re-implements
 * the page's read would still pass with the page broken.
 */
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const seen = vi.hoisted(() => ({ keys: -1, members: -1, services: -1, assignees: -1, matrix: false }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/keys',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
vi.mock('@/views/keys', () => ({ KeysView: (p: { rows: unknown[] }) => { seen.keys = p.rows.length; return null; } }));
vi.mock('@/views/members', () => ({ MembersView: (p: { rows: unknown[]; matrix?: unknown }) => { seen.members = p.rows.length; seen.matrix = p.matrix !== undefined; return null; } }));
vi.mock('@/views/tickets', () => ({ TicketsView: (p: { services: unknown[]; assignees: unknown[] }) => { seen.services = p.services.length; seen.assignees = p.assignees.length; return null; } }));

import KeysPage from '../app/(dashboard)/keys/page';
import MembersPage from '../app/(dashboard)/members/page';
import TicketsPage from '../app/(dashboard)/operations-tickets/page';

type Row = Record<string, unknown>;
function store(name: string): { rows: Row[]; next: number } {
  const key = Symbol.for('zz-meridian.collections');
  const stores = ((globalThis as Record<symbol, unknown>)[key] ??= new Map()) as Map<string, { rows: Row[]; next: number }>;
  const found = stores.get(JSON.stringify(['demo', name]));
  if (!found) throw new Error(`${name} has no store`);
  return found;
}
/** Adds `n` rows built from the collection's own first row, and answers how many it holds now. */
function grow(name: string, n: number, make: (i: number, base: Row) => Row): number {
  const s = store(name);
  const base = s.rows[0];
  for (let i = 0; i < n; i++) s.rows.push(make(i, base));
  return s.rows.length;
}

beforeEach(() => { jar.value = 'members_1'; });

/** A page as it is served, every boundary resolved. */
async function served(page: Promise<unknown>): Promise<void> {
  const element = (await page) as ReactElement;
  await new Promise<void>((resolve, reject) => {
    const out = new PassThrough();
    out.on('data', () => {});
    out.on('end', () => resolve());
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
}

describe('a page that says every row', () => {
  it('hands the keys page every key the workspace holds, not the first hundred', async () => {
    const total = grow('keys', 120, (i, base) => ({ ...base, id: `keys_more_${i}`, name: `Key ${i}` }));
    expect(total).toBeGreaterThan(100);
    await served(KeysPage());
    expect(seen.keys).toBe(total);
  });

  it('hands the members page every member', async () => {
    const total = grow('members', 120, (i, base) => ({
      ...base, id: `members_more_${i}`, name: `Person ${i}`, email: `person.${i}@${'example.com'}`, role: 'Member', addOns: [], status: 'Active', lastActive: base.joined,
    }));
    expect(total).toBeGreaterThan(100);
    await served(MembersPage());
    expect(seen.members).toBe(total);
    // The Roles & access section is the page's, drawn on the server, not worked out again by the view on each keystroke.
    expect(seen.matrix).toBe(true);
  });

  it('offers the tickets page every service and every member it may assign to', async () => {
    const services = grow('services', 111, (i, base) => ({ ...base, id: `services_more_${i}`, order: 1000 + i, name: `Service ${i}` }));
    const members = grow('members', 120, (i, base) => ({
      ...base, id: `members_more_${i}`, name: `Person ${i}`, email: `person.${i}@example.com`, role: 'Member', addOns: [], status: 'Active', lastActive: base.joined,
    }));
    await served(TicketsPage());
    expect(seen.services).toBe(services);
    expect(seen.assignees).toBe(members);
  });

  it('reads no service for someone who may not create a ticket, since only the New ticket form offers them', async () => {
    jar.value = String(store('members').rows.find((m) => m.role === 'Viewer' && m.status === 'Active')!.id);
    seen.services = -1;
    await served(TicketsPage());
    expect(seen.services).toBe(0);
  });
});

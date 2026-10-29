// Named cli-* so the payload leaves it out: it renders the sample's own pages, which a product replaces.
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
  notFound: () => { throw new Error('not found'); },
}));

import * as features from '@/data/features';
import * as noAccess from '@/views/no-access';
import { readAll } from '@/data/read';
import { memberAccess } from '@/data/member-mutations';
import KeysPage from '../app/(dashboard)/keys/page';
import TicketsPage from '../app/(dashboard)/operations-tickets/page';
import RequestPage from '../app/(dashboard)/requests/[id]/page';
import MembersPage from '../app/(dashboard)/members/page';
import SettingsPage from '../app/(dashboard)/settings/page';
import RecordsPreview from '@/components/templates/records/preview';
import FormSectionPreview from '@/components/patterns/form-section/preview';

const PERSONA = { admin: 'members_2', member: 'members_4', viewer: 'members_12' } as const;

/**
 * The form FR-30 refuses: a sentence that names roles beside what they may do. "Owners, Admins and Members create and
 * change tickets." and "Only an Owner can change the workspace." are it; a role named alone, as a member's role in a row
 * or a column of the roles' reference table, is not.
 */
const WHO_CAN = [
  /\b(Owners|Admins|Members|Viewers|Key managers)(, (Owners|Admins|Members|Viewers|Key managers))* (and|or) (Owners|Admins|Members|Viewers|Key managers)\b/,
  /\bOnly (an? )?(owner|admin|member|key manager)s?\b/i,
  /\bAsk (an? )?(Owner|Admin)\b/,
];
const whoCan = (text: string) => WHO_CAN.flatMap((re) => text.match(re)?.[0] ?? []);

/** A document's text, one text node from the next by a space, so a heading and the sentence after it stay two words. */
function textOf(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) parts.push(n.textContent ?? '');
  return parts.join(' ');
}

/** A page as it is served, every boundary resolved, as its text. */
async function served(page: Promise<unknown> | unknown): Promise<string> {
  const element = (await page) as ReactElement;
  const html = await new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{element}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
  return textOf(html);
}

beforeEach(() => { jar.value = undefined; });

describe('the line that said who can is gone from what the product declares', () => {
  it('no action carries a line, and no helper writes one', () => {
    for (const [id, action] of Object.entries(features.ACTIONS)) expect(Object.keys(action), id).not.toContain('line');
    expect(Object.keys(noAccess)).not.toContain('actionLine');
  });
});

describe('a page that withholds a control says nothing about who holds it', () => {
  it('API keys, for a Member, who may read the keys and neither create nor revoke one', async () => {
    jar.value = PERSONA.member;
    const text = await served(KeysPage());
    expect(text).not.toContain('Create key');
    expect(whoCan(text)).toEqual([]);
  });

  it('Tickets, for a Viewer, who may read the tickets and neither create nor change one', async () => {
    jar.value = PERSONA.viewer;
    const text = await served(TicketsPage());
    expect(text).toContain('Tickets');
    expect(whoCan(text)).toEqual([]);
  });

  it('a failed request, for a Viewer, who may not replay it', async () => {
    jar.value = PERSONA.viewer;
    const failed = (await readAll('requests')).rows.find((r) => Number((r as { status: number }).status) >= 500) as { id: string };
    expect(failed, 'the sample holds a failed request').toBeTruthy();
    const text = await served(RequestPage({ params: Promise.resolve({ id: failed.id }) }));
    expect(text).toContain(failed.id);
    expect(text).not.toMatch(/\bReplay\b/);
    expect(whoCan(text)).toEqual([]);
  });

  it('Members, for a Member, who may read the members and change none of them', async () => {
    jar.value = PERSONA.member;
    const text = await served(MembersPage());
    expect(text).toContain('Members');
    expect(whoCan(text)).toEqual([]);
  });

  it("an Owner's row, for an Admin, who may change every member but an Owner: no reason that names who can", async () => {
    jar.value = PERSONA.admin;
    const owner = (await readAll('members')).rows.find((m) => (m as { role: string }).role === 'Owner') as { id: string };
    const may = (await memberAccess([owner.id]))[owner.id];
    expect(may.changeRole).toBe(false);
    expect(whoCan(may.reason ?? '')).toEqual([]);
    expect(whoCan(await served(MembersPage()))).toEqual([]);
  });

  it('Settings, for an Admin, who may read the workspace and not change it', async () => {
    jar.value = PERSONA.admin;
    const text = await served(SettingsPage());
    expect(text).toContain('What this workspace is called');
    expect(whoCan(text)).toEqual([]);
  });
});

describe('the patterns a product copies show a read-only state without the line', () => {
  it('the Records template and the Form section previews', () => {
    for (const [name, Preview] of [['records', RecordsPreview], ['form-section', FormSectionPreview]] as const) {
      const html = renderToStaticMarkup(<Tooltip.Provider><Preview /></Tooltip.Provider>);
      const text = textOf(html);
      expect(text, name).toMatch(/Read-only/);
      expect(whoCan(text), name).toEqual([]);
    }
  });
});

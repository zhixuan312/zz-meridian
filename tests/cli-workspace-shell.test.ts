// @vitest-environment node
// Named cli-* so the payload leaves it out: it draws the Atlas's shell, which a product does not keep.
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/system',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { workspaces } from '@/app.config';
import { chromeAccess } from '@/data/access';
import { AtlasShell } from '@/system/atlas-shell';
import { NoAccess } from '@/views/no-access';

const ROOT = path.resolve(import.meta.dirname, '..');
/** The chrome `gate` hands the refusal: resolved for the reader, and null when who they are cannot be told. */
const chrome = () => chromeAccess().catch(() => null);
/** The links a piece of markup holds, each as its address and its words. */
const linksOf = (html: string) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]*>/g, '').trim() }));

beforeEach(() => { jar.value = 'members_12'; });

describe('a page a person may not open', () => {
  it('offers the first destination of its own workspace that they may: for a Viewer at API keys, Now', async () => {
    const html = renderToStaticMarkup(await NoAccess({ feature: 'keys', access: await chrome() }));
    expect(html).toContain('data-no-access');
    expect(linksOf(html)).toEqual([{ href: '/engineering', text: expect.stringContaining('Now') }]);
  });

  it('offers Main\'s home for a Viewer at Members', async () => {
    const html = renderToStaticMarkup(await NoAccess({ feature: 'members', access: await chrome() }));
    expect(linksOf(html)).toEqual([{ href: '/', text: expect.stringContaining('Home') }]);
  });

  it('still says who can open it and whom to ask', async () => {
    const html = renderToStaticMarkup(await NoAccess({ feature: 'keys', access: await chrome() }));
    expect(html).toContain('can open it');
    expect(html).toContain('for access');
  });
});

describe('the Atlas', () => {
  it('offers the way back to Main and a way into each of the other workspaces, under their names', () => {
    const shelf: Parameters<typeof AtlasShell>[0] = { nav: [], children: null };
    const html = renderToStaticMarkup(createElement(AtlasShell, shelf));
    const links = linksOf(html);
    for (const id of ['main', 'business', 'engineering'] as const) {
      expect(links.some((l) => l.href === workspaces[id].homeHref && l.text.includes(workspaces[id].label)), id).toBe(true);
    }
  });
});

describe('Business, as a workspace home', () => {
  it('says who the workspace is for, in the words the declaration holds', () => {
    expect(fs.readFileSync(path.join(ROOT, 'app/(dashboard)/business/page.tsx'), 'utf8')).toMatch(/workspaces\.business\.audience/);
  });
});

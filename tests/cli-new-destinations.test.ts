// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own pages, which a product replaces.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { nav, workspaces } from '@/app.config';
import { FEATURES } from '@/data/features';
import { PAGES } from '@/system/content';
import { viewTools } from '@/views/tools';
import { workspaceOf } from '@/views/workspaces';

const ROOT = path.resolve(import.meta.dirname, '..');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const features = FEATURES as Record<string, { title: string; needs: unknown }>;
const items = nav.flatMap((g) => g.items);
const tools = Object.fromEntries(viewTools.map((t) => [t.name, t]));

describe('Business and Engineering each open on a home of their own', () => {
  it('declares Revenue and Now as features and as the first entry of their workspace', () => {
    for (const [id, title, href, workspace] of [['revenue', 'Revenue', '/business', 'business'], ['now', 'Now', '/engineering', 'engineering']] as const) {
      expect(features[id]?.title, id).toBe(title);
      const entry = items.find((i) => i.href === href);
      expect([entry?.label, entry?.workspace], href).toEqual([title, workspace]);
      expect(entry?.needs, href).toBe(features[id].needs);
      expect(items.filter((i) => i.workspace === workspace)[0]?.href, workspace).toBe(href);
      expect(workspaces[workspace].homeHref, workspace).toBe(href);
    }
  });

  it('gives each a route with a skeleton, a specification that says what the agent reads, and a place in the Atlas', () => {
    for (const [id, folder, route] of [['revenue', 'business', '/business'], ['now', 'engineering', '/engineering']] as const) {
      for (const file of ['page.tsx', 'loading.tsx', 'README.md']) expect(exists(`app/(dashboard)/${folder}/${file}`), `${folder}/${file}`).toBe(true);
      const spec = read(`app/(dashboard)/${folder}/README.md`);
      for (const heading of ['## Structure', '## States', '### What the agent reads']) expect(spec, `${folder}: ${heading}`).toContain(heading);
      const page = PAGES.find((p) => p.id === id);
      expect([page?.route, page?.spec], id).toEqual([route, `app/(dashboard)/${folder}/README.md`]);
    }
  });

  it('opens each through a view tool that asks its feature', () => {
    for (const id of ['revenue', 'now']) expect(tools[id]?.needs, id).toBe(features[id].needs);
  });
});

describe('one customer has a page', () => {
  it('is a feature that asks what the list of customers asks, so a refusal leads back into Business', () => {
    expect(features.customer?.needs).toBe(features.customers.needs);
    expect(workspaceOf('/customers/northwind-labs')).toBe('business');
  });

  it('has a route under the list, a skeleton, a specification and a view tool', () => {
    for (const file of ['page.tsx', 'loading.tsx', 'README.md']) expect(exists(`app/(dashboard)/customers/[id]/${file}`), file).toBe(true);
    expect(tools.customer?.needs).toBe(features.customer.needs);
    const page = PAGES.find((p) => p.id === 'customer');
    expect(page?.route, 'the Atlas names a real customer').toMatch(/^\/customers\/[a-z0-9-]+$/);
    expect(page?.spec).toBe('app/(dashboard)/customers/[id]/README.md');
  });
});

describe('the embed view of what is happening now', () => {
  it('is Now, read from the Now tool, and the 90-day record has none', () => {
    expect(exists('app/embed/now/page.tsx')).toBe(true);
    expect(exists('app/embed/health')).toBe(false);
    expect(tools.now?.resourceUri, 'the Now tool names its view').toMatch(/\/now$/);
    expect(viewTools.filter((t) => t.resourceUri && !['now', 'requests', 'overview', 'home'].includes(t.name)).map((t) => t.name)).toEqual([]);
    expect(PAGES.find((p) => p.id === 'now')?.embed).toBe('/embed/now');
  });
});

// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the sample's own destinations, which a product replaces.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { nav, workspaces } from '@/app.config';
import { FEATURES } from '@/data/features';
import { PAGES } from '@/system/content';
import { viewTools } from '@/logic/tools';

const ROOT = path.resolve(import.meta.dirname, '..');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

/** The rail, in its order: workspace, name, address, and the feature whose need the entry asks. */
const RAIL = [
  ['main', 'Home', '/', 'home'],
  ['main', 'Members', '/members', 'members'],
  ['main', 'Settings', '/settings', 'settings'],
  ['main', 'Design system', '/system', 'system'],
  ['main', 'Docs', '/system/start/start-a-dashboard', 'docs'],
  ['business', 'Revenue', '/business', 'revenue'],
  ['business', 'Customers', '/customers', 'customers'],
  ['business', 'Usage', '/usage', 'usage'],
  ['business', 'Requests', '/requests', 'requests'],
  ['engineering', 'Now', '/engineering', 'now'],
  ['engineering', 'Services', '/services', 'services'],
  ['engineering', 'Tickets', '/operations-tickets', 'tickets'],
  ['engineering', 'Tests', '/tests', 'tests'],
  ['engineering', 'Releases', '/releases', 'releases'],
  ['engineering', 'API keys', '/keys', 'keys'],
] as const;

describe('the destinations', () => {
  it('are the fifteen of the rail, in order, each under its name at its address in its workspace', () => {
    expect(nav.flatMap((g) => g.items).map((i) => [i.workspace, i.label, i.href])).toEqual(RAIL.map(([workspace, label, href]) => [workspace, label, href]));
  });

  it('each ask the need of their own feature, by reference', () => {
    const items = nav.flatMap((g) => g.items);
    for (const [, label, href, feature] of RAIL) {
      expect(FEATURES[feature as keyof typeof FEATURES], `${label} has no feature "${feature}"`).toBeTruthy();
      expect(items.find((i) => i.href === href)!.needs, label).toBe(FEATURES[feature as keyof typeof FEATURES].needs);
      expect(FEATURES[feature as keyof typeof FEATURES].title, feature).toBe(label);
    }
  });

  it('open each workspace at its home', () => {
    expect(Object.entries(workspaces).map(([id, w]) => [id, w.homeHref])).toEqual([['main', '/'], ['business', '/business'], ['engineering', '/engineering']]);
  });

  it('give one customer and one request a page that asks what its list asks', () => {
    const features = FEATURES as Record<string, { title: string; needs: unknown }>;
    expect(features.customer?.needs).toBe(features.customers.needs);
    expect(features.request).toBeTruthy();
    for (const page of ['app/(dashboard)/customers/[id]/page.tsx', 'app/(dashboard)/requests/[id]/page.tsx']) expect(exists(page), page).toBe(true);
  });

  it('each have a route', () => {
    for (const page of ['(home)', 'business', 'usage', 'engineering', 'services']) expect(exists(`app/(dashboard)/${page}/page.tsx`), page).toBe(true);
  });
});

describe('the views an agent opens', () => {
  it('are named for their features', () => {
    expect(viewTools.map((t) => t.name).sort()).toEqual(['customer', 'customers', 'home', 'keys', 'members', 'now', 'releases', 'request', 'requests', 'revenue', 'services', 'tests', 'tickets', 'usage']);
    const features = FEATURES as Record<string, { needs: unknown }>;
    for (const tool of viewTools) expect(tool.needs, tool.name).toBe(features[tool.name].needs);
  });

  it('embed as Home, Requests, Now and Proposal, and nothing else', () => {
    const embeds = fs.readdirSync(path.join(ROOT, 'app/embed'), { withFileTypes: true }).filter((e) => e.isDirectory() && exists(`app/embed/${e.name}/page.tsx`)).map((e) => e.name).sort();
    expect(embeds).toEqual(['home', 'now', 'proposal', 'requests']);
    expect(viewTools.filter((t) => t.resourceUri).map((t) => t.name).sort()).toEqual(['home', 'now', 'requests']);
  });
});

describe('the Atlas', () => {
  it('lists each page of the product under its name, at an address that opens', () => {
    const byId = Object.fromEntries(PAGES.map((p) => [p.id, p]));
    const want: [string, string, string][] = [
      ['home', 'Home', '/'], ['revenue', 'Revenue', '/business'], ['usage', 'Usage', '/usage'], ['now', 'Now', '/engineering'],
      ['services', 'Services', '/services'], ['tickets', 'Tickets', '/operations-tickets'], ['tests', 'Tests', '/tests'],
    ];
    for (const [id, title, route] of want) expect([byId[id]?.title, byId[id]?.route], id).toEqual([title, route]);
    expect(byId.customer?.route, 'the customer page names a real record').toMatch(/^\/customers\/[a-z0-9-]+$/);
    expect(byId.home?.embed).toBe('/embed/home');
    expect(byId.now?.embed).toBe('/embed/now');
    for (const p of PAGES) expect(exists(p.spec), `${p.id}: ${p.spec}`).toBe(true);
  });
});

describe("the sample's navigation", () => {
  // `badge` is a field a product passes, worked out from its data; the sample's had a typed '1' that said one incident
  // was open whatever the incidents were.
  it('carries no count that somebody typed', () => {
    expect(nav.flatMap((g) => g.items).filter((i) => i.badge !== undefined).map((i) => i.href)).toEqual([]);
  });
});

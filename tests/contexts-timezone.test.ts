// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' ? { name: n, value: 'members_1' } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
// A product that reports in its own zone: every time and day it states is in that zone, so none may say UTC.
vi.mock('@/app.config', async (orig) => {
  const real = await orig<typeof import('@/app.config')>();
  return { ...real, app: { ...real.app, timezone: 'Asia/Singapore' } };
});

import { contextText, viewAt } from '@/lib/shared-context';
import { viewTools } from '@/logic/tools';
import { detailRoutes } from '../scripts/lib/team-config.ts';

/**
 * A detail page's view reads one record, named by the address: its input comes from a route the team lists in
 * `detailRoutes` (scripts/verify.config.ts) that renders it, each `[segment]` of its page read from that address.
 */
function inputOf(page: string): Record<string, string> | null {
  if (!page.includes('[')) return {};
  const route = detailRoutes.find((r) => viewAt(viewTools, r)?.page === page);
  if (!route) return null;
  const parts = route.split('/');
  return Object.fromEntries(page.split('/').flatMap((seg, i) => (/^\[(\w+)\]$/.test(seg) ? [[seg.slice(1, -1), parts[i]!]] : [])));
}

describe("every view's context names the product's reporting timezone, never UTC", () => {
  for (const tool of viewTools) {
    const input = inputOf(tool.page);
    it.skipIf(!input)(input ? tool.name : `${tool.name} (no route in detailRoutes renders ${tool.page})`, async () => {
      const { context } = await tool.read(tool.input.parse(input) as never);
      // A zone as a label, after a time or over a span of days; a ticket's own title may still mention UTC.
      expect(contextText(context)).not.toMatch(/\d\d:\d\d UTC\b|\(UTC\b/);
    });
  }
});

// The assistant reads a collection's description as its tool's; a day or an hour there is in the same zone.
describe("every collection's description names the product's reporting timezone, never UTC", async () => {
  const { collections } = await import('@/data/collections');
  for (const c of collections) it(c.name, () => expect(c.description).not.toMatch(/\(UTC\b/));
});

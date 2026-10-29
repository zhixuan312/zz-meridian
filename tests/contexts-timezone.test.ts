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

import { contextText } from '@/lib/shared-context';
import { viewTools } from '@/logic/tools';
import { collections } from '@/data/collections';

describe("every view's context names the product's reporting timezone, never UTC", () => {
  for (const tool of viewTools) {
    it(tool.name, async () => {
      const input = tool.name === 'request' ? { id: (await collections.find((c) => c.name === 'requests')!.query({ limit: 1 })).rows[0].id }
        : tool.name === 'customer' ? { id: (await collections.find((c) => c.name === 'customers')!.query({ limit: 1 })).rows[0].id }
        : {};
      const { context } = await tool.read(tool.input.parse(input) as never);
      // A zone as a label, after a time or over a span of days; a ticket's own title may still mention UTC.
      expect(contextText(context)).not.toMatch(/\d\d:\d\d UTC\b|\(UTC\b/);
    });
  }
});

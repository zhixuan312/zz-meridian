// @vitest-environment node
// A page and a route handler are separate bundles in one server process, each with its own copy of
// src/lib/collection.ts. A boot id held in the module differed between them, so every first open looked like a restart
// and resynced: the page's revisions never matched the stream's (#53). The boot id is one per process.
import { expect, it, vi } from 'vitest';
import { z } from 'zod';

const bootOf = async () => {
  vi.resetModules();
  const { arrayCollection } = await import('@/lib/collection');
  const c = arrayCollection({
    name: 'boots', label: 'Boots', description: 'One per process.', key: 'id', title: (r: { name: string }) => r.name,
    fields: z.object({ name: z.string().min(1) }), rows: [] as { id: string; name: string }[], allow: ['create'], tenantId: 'boot-test',
  });
  return c.revision!().split(':')[0];
};

it('is the same in every copy of the module a process loads', async () => {
  expect(await bootOf()).toBe(await bootOf());
});

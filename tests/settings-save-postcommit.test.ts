// @vitest-environment node
// The workspace save wrote through the collection and then dropped the cached reads inside one `try`: a cache that could
// not be dropped was reported as "The change did not go through." over a name already in the store, so the person would
// save again. The write-boundary rule (and the requests replay) is that the write is the commit and a cache failure is a
// warning.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => { throw new Error('no store'); }, revalidateTag: () => {} }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ name: 'zz_meridian_view_as', value: 'members_1' }), set: () => {} }),
  headers: async () => new Headers(),
}));

import { saveWorkspace } from '../app/(dashboard)/settings/actions';

describe('saving the workspace when the cache cannot be dropped', () => {
  it('reports the committed name as saved, with a warning that the page must be reloaded', async () => {
    const r = await saveWorkspace({ name: 'Acme Staging' });
    expect(r).toEqual({ ok: true, warning: expect.stringMatching(/saved, but the workspace could not be re-read/) });
  });
});

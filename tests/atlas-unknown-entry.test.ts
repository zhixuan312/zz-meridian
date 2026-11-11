// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// The Atlas reads the repository on the server; plain Node has no guard module to resolve.
vi.mock('server-only', () => ({}));

import EntryPage from '../app/system/(atlas)/[section]/[id]/page';
import { ReadingPage } from '../app/system/(atlas)/_article';

/**
 * An unknown Atlas entry is answered before any boundary. Wrapped in Suspense, `notFound()` ran after the shell had
 * flushed and the response was a 200 with the not-found screen; this pins the call to the page's own resolution.
 */
describe('an Atlas address that names nothing', () => {
  it('is a not-found answer from the staged route, thrown before rendering', async () => {
    await expect(EntryPage({ params: Promise.resolve({ section: 'pages', id: 'typo' }) })).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });
  it('is a not-found answer from a reading route too', async () => {
    await expect(ReadingPage({ section: 'start', params: Promise.resolve({ id: 'nope' }) })).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });
});

// @vitest-environment node
// Named cli-* because it exercises the sample's own workspace journey.
import { afterEach, expect, it, vi } from 'vitest';

async function selected(detailRoutes: string[], missingRoutes?: string[]) {
  vi.resetModules();
  vi.doMock('../scripts/verify.config.ts', () => ({ default: { detailRoutes, missingRoutes } }));
  // Selection happens at module load; import after each config mock rather than caching a static import.
  return (await import('../journeys/workspaces.ts')).requestDetail;
}
afterEach(() => { vi.doUnmock('../scripts/verify.config.ts'); });

it('opens a configured existing request regardless of its name, never a declared missing record', async () => {
  expect(await selected(['/requests/absent', '/requests/req_missing_fields'], ['/requests/absent'])).toBe('/requests/req_missing_fields');
  expect(await selected(['/requests/absent'], ['/requests/absent'])).toBeUndefined();
  expect(await selected(['/customers/customer', '/requests/req_missing_fields'])).toBe('/requests/req_missing_fields');
});

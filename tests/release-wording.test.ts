import { describe, expect, it } from 'vitest';
import { RELEASE_METRICS, releasesContext } from '@/logic/releases-context';
import type { ReleaseRow } from '@/data/engineering';

// A run that failed is not something a release waits for: every surface that names it, the tile's definition and what
// the assistant is told, says the verification has not passed, and then why.
describe('a release with a required verification that failed', () => {
  const row = {
    id: 'releases_x', version: 'v1.0.0', service: 'Gateway', environment: 'production', commit: 'abc1234', state: 'testing',
    updatedAt: '2026-01-01T00:00:00.000Z', releasedAt: null, notes: '', requiredVerifications: [{ suite: 'smoke', endpointId: 'POST /v1/messages' }],
    verification: { required: 1, passed: 0, unresolved: [{ suite: 'smoke', endpointId: 'POST /v1/messages', state: 'failed' }] },
  } as unknown as ReleaseRow;

  it('is told to the assistant as not passed, never as waited for', () => {
    const context = releasesContext([row], '2026-01-02T00:00:00.000Z', { q: '', state: 'all', environment: 'all' });
    const text = context.insights.map((i) => i.text).join(' ');
    expect(text).toContain('has not passed smoke on POST /v1/messages: failed');
    expect(text).not.toMatch(/waits? for/);
  });

  it('is defined on the tile without the word', () => {
    expect(RELEASE_METRICS.testing.hint).not.toMatch(/waits? for/);
  });
});

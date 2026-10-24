import { describe, expect, it } from 'vitest';
import { unresolvedCounts } from '@/logic/releases-context';

// On a phone the Verification cell has one line, so it counts what has not passed. It says what each count is: a run
// that failed is not waiting for anything.
describe('what a release has not passed, in a line', () => {
  it('names a failed run as failed and a skipped one as skipped', () => {
    expect(unresolvedCounts([{ suite: 'smoke', endpointId: 'POST /v1/embeddings', state: 'failed' }])).toBe('1 failed');
    expect(unresolvedCounts([{ suite: 'load', endpointId: 'POST /v1/messages', state: 'skipped' }])).toBe('1 skipped');
  });

  it('says a verification with no run has not run', () => {
    expect(unresolvedCounts([{ suite: 'load', endpointId: 'POST /v1/messages', state: 'missing' }])).toBe('1 not run');
  });

  it('counts each kind once, failed first', () => {
    expect(
      unresolvedCounts([
        { suite: 'load', endpointId: 'a', state: 'missing' },
        { suite: 'smoke', endpointId: 'a', state: 'failed' },
        { suite: 'smoke', endpointId: 'b', state: 'missing' },
        { suite: 'load', endpointId: 'b', state: 'skipped' },
      ]),
    ).toBe('1 failed, 1 skipped, 2 not run');
  });

  it('never calls anything waiting', () => {
    for (const state of ['missing', 'failed', 'skipped'] as const) expect(unresolvedCounts([{ suite: 's', endpointId: 'e', state }])).not.toMatch(/waiting/);
  });
});

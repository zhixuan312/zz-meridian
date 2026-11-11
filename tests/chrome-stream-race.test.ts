// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isStreamedPlaceholderRace, type ExceptionDetails } from '../scripts/lib/chrome.ts';

// React's streamed-Suspense inline completion script can dereference a placeholder the deferred flush already removed
// under CPU load. It leaves the page complete and interactive, so it is not the product's error (issue #143).
const PAGE = 'http://127.0.0.1:3000/platform/teams/dune';
const details = (over: Partial<ExceptionDetails> & { frames?: { functionName?: string; url?: string }[] } = {}): ExceptionDetails => ({
  exception: { description: "TypeError: Cannot read properties of null (reading 'parentNode')\n    at $RS (http://127.0.0.1:3000/platform/teams/dune:4:4832)\n    at http://127.0.0.1:3000/platform/teams/dune:4:11391" },
  url: PAGE,
  stackTrace: { callFrames: over.frames ?? [{ functionName: '$RS', url: PAGE }, { functionName: '', url: PAGE }] },
  ...(over.exception ? { exception: over.exception } : {}),
});

describe('isStreamedPlaceholderRace', () => {
  it('tolerates the exact React signature: parentNode, thrown inline from $RS or its unminified name', () => {
    expect(isStreamedPlaceholderRace(details())).toBe(true);
    expect(isStreamedPlaceholderRace(details({ frames: [{ functionName: 'completeSegment', url: PAGE }] }))).toBe(true);
  });

  it('leaves the other React boundary calls failing: only the captured call is tolerated', () => {
    // $RC completes a boundary, $RX is the client-render-boundary path a real failure takes, $RV is the deferred flush:
    // a parentNode throw in any of them may sit beside a real failure and must stay an error.
    for (const functionName of ['$RC', '$RX', '$RV', '$RM', 'completeBoundary']) {
      expect(isStreamedPlaceholderRace(details({ frames: [{ functionName, url: PAGE }] })), functionName).toBe(false);
    }
  });

  it('fails the same exception when an application frame is in its stack', () => {
    expect(isStreamedPlaceholderRace(details({ frames: [{ functionName: '$RS', url: PAGE }, { functionName: 'TeamPage', url: 'http://127.0.0.1:3000/_next/static/chunks/app/page-1a2b.js' }] }))).toBe(false);
  });

  it('fails the same message from any other function, and any other message from the same function', () => {
    expect(isStreamedPlaceholderRace(details({ frames: [{ functionName: 'TeamPage', url: PAGE }] }))).toBe(false);
    expect(isStreamedPlaceholderRace(details({ exception: { description: "TypeError: Cannot read properties of undefined (reading 'parent')" } }))).toBe(false);
    expect(isStreamedPlaceholderRace({ exception: { description: "TypeError: Cannot read properties of null (reading 'parentNode')" } })).toBe(false);
  });
});

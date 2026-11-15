// @vitest-environment node
// A run never stops at the first failure, and it never drops a check silently. A step that everything below depends on —
// the app server, the assistant restart — used to be judged by the run's failure flag rather than by its own result, so an
// earlier FAIL ended the run there: on one product the assistant walk-through, the audit, the presses, the keyboard walk,
// all six product checks and the whole timed set never ran and were never listed as not run, and the closing line read as
// one failure among the checks that did run.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { afterSetupStep } from '../scripts/lib/browser-plan.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'scripts/browser.ts'), 'utf8');

describe('a step everything below depends on', () => {
  it('carries on when the step itself succeeded, whatever else the run has already failed', () => {
    // The signature is the fix: an earlier failure is not an argument, so it cannot end the run here.
    expect(afterSetupStep(true, 'the assistant restart', 'the assistant server did not come back')).toEqual({ carryOn: true, notRun: [] });
  });

  it('stops when the step itself failed, and names what will not run', () => {
    expect(afterSetupStep(false, 'the assistant restart', 'the assistant server did not come back')).toEqual({
      carryOn: false,
      notRun: ['every check after the assistant restart (the assistant server did not come back)'],
    });
  });

  it('is judged by the server start it is about, not by the failure flag', () => {
    expect(SOURCE).toContain("afterSetupStep(server.ok, 'the assistant restart'");
    expect(SOURCE).toContain("afterSetupStep(server.ok, 'the app server'");
    expect(SOURCE).toContain("afterSetupStep(build.status === 0, 'the build'");
    // Nothing stops on the run's flag: a red in one judge must not hide the others, and a Tier 2 measurement must not
    // depend on an unrelated Tier 1 failure. A step that truly cannot run says so from its own result, and the check that
    // needs a server fails with its own message.
    expect(SOURCE.match(/if \(failed\) finish\(\)/g) ?? []).toHaveLength(0);
  });

  it('starts a server and says whether it came back', () => {
    expect(SOURCE).toMatch(/Promise<\{ port: number; server: ChildProcess; ok: boolean \}>/);
  });
});

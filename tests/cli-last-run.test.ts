// @vitest-environment node
// A red run leaves a record the next run starts from, so a fix runs the failures and the fix's own checks instead of
// everything since the last green run. These cases hold the record's shape and the two rules it carries: a record with no
// usable tree is ignored, and a retry of an unchanged tree is allowed once and never counted as green.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { clearLastRun, readLastRun, retryBaseline, retryNumber, writeLastRun, type LastRun } from '../scripts/lib/last-run.ts';

const roots: string[] = [];
const scratch = () => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'last-run-')); fs.mkdirSync(path.join(root, 'out')); roots.push(root); return root; };
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

const TREE = '1ee5f957ba26185e84026aed9198c0a6cb0bfe70';

describe('the record a red run leaves', () => {
  it('is written with the tree it ran on, the tests it failed, and how many times the unchanged tree was retried', () => {
    const root = scratch();
    writeLastRun(root, { tree: TREE, failed: ['tests/a.test.ts', 'tests/b.test.tsx'], retries: 0 });
    expect(readLastRun(root)).toEqual({ tree: TREE, failed: ['tests/a.test.ts', 'tests/b.test.tsx'], retries: 0 });
  });

  it('is gone once a run ends green', () => {
    const root = scratch();
    writeLastRun(root, { tree: TREE, failed: ['tests/a.test.ts'], retries: 0 });
    clearLastRun(root);
    expect(readLastRun(root)).toBeNull();
  });

  it('is null when there is no record, when the file is not JSON, and when it holds no tree', () => {
    const root = scratch();
    expect(readLastRun(root)).toBeNull();
    fs.writeFileSync(path.join(root, 'out', 'last-run.json'), 'not json');
    expect(readLastRun(root)).toBeNull();
    fs.writeFileSync(path.join(root, 'out', 'last-run.json'), JSON.stringify({ failed: ['tests/a.test.ts'] }));
    expect(readLastRun(root)).toBeNull();
  });

  it('is null when a case of the failed list is not a path, so a malformed record never widens a selection', () => {
    const root = scratch();
    fs.writeFileSync(path.join(root, 'out', 'last-run.json'), JSON.stringify({ tree: TREE, failed: [7], retries: 0 }));
    expect(readLastRun(root)).toBeNull();
  });
});

describe('where the next run begins', () => {
  it('is the tree the failed run proved, so the fix is what differs from it', () => {
    const last: LastRun = { tree: TREE, failed: ['tests/a.test.ts'], retries: 0 };
    expect(retryBaseline(last)).toEqual({ ref: TREE, from: 'the run that failed' });
  });

  it('is nothing without a record, so the caller falls back to the marker', () => {
    expect(retryBaseline(null)).toBeNull();
  });
});

describe('the retries an unchanged tree has already had', () => {
  it('allows the first, and refuses the second: a red is fixed, never retried away', () => {
    expect(retryNumber({ tree: TREE, failed: ['tests/a.test.ts'], retries: 0 })).toBe(1);
    expect(retryNumber({ tree: TREE, failed: ['tests/a.test.ts'], retries: 1 })).toBeNull();
  });

  it('allows the first after a run that failed on a different tree', () => {
    expect(retryNumber(null)).toBe(1);
  });
});

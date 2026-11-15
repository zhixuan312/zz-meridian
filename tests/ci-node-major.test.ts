// @vitest-environment node
// `ciGaps` compares the local Node major against CI's so it can name what is left unjudged. It carried its own copy of
// the number (22), so moving the repository's major would have left it comparing against a stale one — a gap reported
// where there is none, or a real one missing. The read is `.nvmrc`, the place the repository writes it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CI_NODE_MAJOR } from '../scripts/lib/ci-node.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const made: string[] = [];
afterAll(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

describe('the Node major CI builds under', () => {
  it('is the one this repository writes in .nvmrc', () => {
    expect(CI_NODE_MAJOR).toBe(Number.parseInt(fs.readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim(), 10));
  });

  it('falls back to 22 rather than throwing when there is no .nvmrc', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-node-'));
    made.push(dir);
    // The module was read at import time in the repository; the fallback is proved in a process of its own.
    const runDir = path.join(dir, 'no-nvmrc');
    fs.mkdirSync(runDir);
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', `import(${JSON.stringify(new URL('../scripts/lib/ci-node.ts', import.meta.url).href)}).then((m) => console.log(m.CI_NODE_MAJOR))`], { cwd: runDir, encoding: 'utf8' });
    expect(out.trim()).toBe('22');
  });
});

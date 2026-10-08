// @vitest-environment node
// Named deep-* so the payload leaves it out: it runs the real browser suites against the fixture server in scripts/fixtures/deep.
// One case per manifest entry (scripts/fixtures/deep/expected.json), read at run time, so an edit to the manifest can never
// silently drop a case. Each suite adds its own `describe` below by calling `casesFor(suite, command, timeout)`.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

type Entry = { page: string; suite: string; outcome: 'fail' | 'pass' | 'note'; line?: string };
const MANIFEST: Entry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/deep/expected.json'), 'utf8'));

let server: ChildProcess;
let url = '';

beforeAll(async () => {
  server = spawn(process.execPath, ['scripts/fixtures/deep/server.ts'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  url = await new Promise<string>((resolve, reject) => {
    server.on('error', reject);
    server.stdout!.on('data', (d) => { const m = String(d).match(/listening on (\S+)/); if (m) resolve(m[1]); });
  });
}, 60_000);

afterAll(() => { server?.kill(); });

/**
 * The real entry point for one manifest entry, run as a child process under a timeout. `args` turns an entry's page and
 * the server's url into the command line after `node`; the result is the exit code and everything the suite printed.
 */
function runSuite(args: string[], timeout: number) {
  return new Promise<{ code: number | null; timedOut: boolean; out: string }>((resolve) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let timedOut = false;
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: null, timedOut, out: out + String(e) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, timedOut, out }); });
  });
}

/** One `it` per manifest entry of `suite` (run a few at a time); asserts the entry's outcome (exit code) and its line. */
function casesFor(suite: string, command: (page: string, base: string) => string[], timeout: number) {
  const entries = MANIFEST.filter((e) => e.suite === suite);
  it(`the manifest has cases for ${suite}`, () => { expect(entries.length).toBeGreaterThan(0); });
  for (const e of entries) {
    it.concurrent(`${e.page}: ${e.outcome}${e.line ? ` (${e.line})` : ''}`, async () => {
      const r = await runSuite(command(e.page, url), timeout);
      expect(r.timedOut, `timed out after ${timeout} ms\n${r.out}`).toBe(false);
      expect(r.code, r.out).toBe(e.outcome === 'fail' ? 1 : 0);
      if (e.line) expect(r.out).toContain(e.line);
    }, timeout + 10_000);
  }
}

describe('audit', () => {
  // Five widths in two themes per page, with Chrome started once per run.
  casesFor('audit', (page, base) => ['scripts/audit.ts', '--base', base, '--routes', page], 180_000);
});

describe('presses', () => {
  // Every control pressed at 1440px with a mouse and at 390px by touch, with Chrome started once per run.
  casesFor('presses', (page, base) => ['scripts/interactions.ts', '--base', base, '--routes', page], 120_000);
});

describe('keyboard', () => {
  // Real Tab presses forward through every stop, then Shift+Tab back through them.
  casesFor('keyboard', (page, base) => ['scripts/keyboard.ts', '--base', base, '--routes', page], 120_000);
});

describe('navigate', () => {
  // The readiness journey on desktop and phone, with the fixture's own mappings and rail. A note passes and prints its line.
  casesFor('navigate', (page, base) => ['scripts/navigate.ts', '--base', base, '--config', 'scripts/fixtures/deep/config.ts', '--rail', '/nav-home,/nav-root-target,/nav-missing-target,/nav-multi', '--routes', page], 180_000);
});

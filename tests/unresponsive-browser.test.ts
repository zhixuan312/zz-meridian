// @vitest-environment node
// A browser that stops answering is not a page that failed. On 2026-11-14 one `test:t2` reported 807 `Runtime.evaluate
// timed out` lines — every page at every width, including a route that does not exist — from its first page, and spent
// three hours doing it. What was loading the machine is not established; the detector is what makes a repeat say so in
// one line, with its reason, instead of a suite of 807. The verdict is the same either way (the check did not run, so the
// run is not green).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isTimeout, watchForStoppedBrowser } from '../scripts/lib/unresponsive.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const timeout = new Error('Runtime.evaluate timed out');
const product = new Error('exception: Cannot read properties of null');

/** A probe that answers what it is told, and counts how often it was asked. */
function probe(answer: boolean) {
  const p = { asked: 0, answer: async () => { p.asked++; return answer; } };
  return p;
}

describe('a browser that stops answering', () => {
  it('reads any DevTools command that timed out as nothing being served, and no page error as that', () => {
    expect(isTimeout(new Error('Runtime.evaluate timed out'))).toBe(true);
    expect(isTimeout(new Error('Page.navigate timed out'))).toBe(true);
    // The first draft named only those two, and a frozen browser walked past it: every failure after the first was this.
    expect(isTimeout(new Error('Emulation.setEmulatedMedia timed out'))).toBe(true);
    expect(isTimeout(new Error('Network.enable timed out'))).toBe(true);
    expect(isTimeout(product)).toBe(false);
    expect(isTimeout(new Error('Error: request timed out'))).toBe(false);
    expect(isTimeout(new Error('Runtime.evaluate: Cannot find context with specified id'))).toBe(false);
  });

  it('says nothing about a page that failed of its own accord', async () => {
    const p = probe(false);
    const watch = watchForStoppedBrowser(p.answer);
    expect(await watch(product)).toBeNull();
    expect(p.asked).toBe(0);
  });

  it('does not probe on one slow page, and probes on the third in a row', async () => {
    const p = probe(true);
    const watch = watchForStoppedBrowser(p.answer);
    expect(await watch(timeout)).toBeNull();
    expect(await watch(timeout)).toBeNull();
    expect(p.asked).toBe(0);
    expect(await watch(timeout)).toBeNull();
    expect(p.asked).toBe(1);
  });

  it('counts consecutive timeouts only: a page that fails its own way starts the count again', async () => {
    const p = probe(false);
    const watch = watchForStoppedBrowser(p.answer);
    await watch(timeout);
    await watch(timeout);
    await watch(product);
    expect(await watch(timeout)).toBeNull();
    expect(p.asked).toBe(0);
  });

  it('reports one reason, with the count and the last error, when a fresh tab does not answer either', async () => {
    const p = probe(false);
    const watch = watchForStoppedBrowser(p.answer);
    await watch(timeout);
    await watch(timeout);
    const reason = await watch(timeout);
    expect(reason).toContain('3');
    expect(reason).toContain('Runtime.evaluate timed out');
    expect(reason).toMatch(/stopped answering/);
  });

  it('leaves a browser that answers its own tab alone, however slow the machine', async () => {
    const p = probe(true);
    const watch = watchForStoppedBrowser(p.answer);
    await watch(timeout);
    await watch(timeout);
    expect(await watch(timeout)).toBeNull();
    // and the count restarts, so a later run of three is judged by its own probe
    await watch(timeout);
    await watch(timeout);
    expect(p.asked).toBe(1);
    await watch(timeout);
    expect(p.asked).toBe(2);
  });

  it('is what every browser suite stops on, and what the page offers to probe with', () => {
    for (const suite of ['scripts/audit.ts', 'scripts/interactions.ts', 'scripts/keyboard.ts']) {
      const source = fs.readFileSync(path.join(ROOT, suite), 'utf8');
      expect(source, suite).toContain('watchForStoppedBrowser(');
      expect(source, suite).toContain('not run: ');
    }
    expect(fs.readFileSync(path.join(ROOT, 'scripts/lib/chrome.ts'), 'utf8')).toContain('responsive()');
  });

  // Before this, a path that named no browser killed the suite with an unhandled `error` event and a stack trace: the run
  // said `Node.js v26` and exit 1, which is neither the product's verdict nor a reason anyone can act on.
  it('reports a browser that cannot start as a check that could not run, once, and not as a stack trace', () => {
    const r = spawnSync(process.execPath, ['scripts/audit.ts', '--base', 'http://127.0.0.1:1', '--routes', '/'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, CHROME: '/nonexistent/chrome' },
    });
    expect(r.status, r.stdout + r.stderr).toBe(2);
    expect(r.stdout).toContain('not run: the browser could not start');
    expect(r.stdout + r.stderr).not.toContain('Node.js v');
  });
});

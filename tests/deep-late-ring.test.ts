// @vitest-environment node
// Named deep-* so the payload leaves it out: it drives headless Chrome against the fixture server in scripts/fixtures/deep.
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launch, type Page } from '../scripts/lib/chrome.ts';
import { DEEP_SOURCE } from '../scripts/lib/deep.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
let server: ChildProcess;
let page: Page;
let base = '';

beforeAll(async () => {
  server = spawn(process.execPath, ['scripts/fixtures/deep/server.ts'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  base = await new Promise<string>((resolve, reject) => {
    server.on('error', reject);
    server.stdout!.on('data', (d) => { const m = String(d).match(/listening on (\S+)/); if (m) resolve(m[1]); });
  });
  page = await launch();
  await page.open(`${base}/late-ring`, { width: 1000, wait: 300 });
}, 60_000);

afterAll(() => { page?.close(); server?.kill(); });

/**
 * A focus style is computed after the key event, not in it: the audit's walk reported 907 "no focus ring" issues across
 * every route and width because it sampled in the tick the Tab arrived, where every stop reads `outline-width: 0px`.
 * Measured on `/` at 1440: 0px at once, 2px one frame later.
 */
describe('a focus ring that lands a frame after the key', () => {
  it('is reported by a walk that waits for it, and missed by one that samples at once', async () => {
    await page.eval(DEEP_SOURCE);
    await page.eval(`(() => {
      window.__before = new WeakMap();
      for (const n of document.querySelectorAll('*')) {
        const c = getComputedStyle(n);
        window.__before.set(n, [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderTopStyle, c.borderTopWidth, c.borderTopColor, c.borderBottomColor, c.borderLeftColor, c.borderRightColor].join('|'));
      }
      document.getElementById('first').focus();
      return true;
    })()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });

    // The tick the key arrives: no ring yet. This is what the audit used to read.
    const atOnce = await page.eval<string>(`(() => {
      const el = deepActive();
      return ringChain(el).some((n) => ringed(n, window.__before.get(n))) ? 'ringed' : 'none';
    })()`);
    expect(atOnce).toBe('none');

    // A frame or two later it is there, which is what the walk now waits for.
    const waited = await page.eval<string>(`(async () => {
      const el = deepActive();
      const frame = () => new Promise((done) => requestAnimationFrame(() => done(true)));
      const marked = () => ringChain(el).some((n) => ringed(n, window.__before.get(n)));
      for (let i = 0; i < 6 && !marked(); i++) await frame();
      return marked() ? 'ringed' : 'none';
    })()`);
    expect(waited).toBe('ringed');
  }, 60_000);
});

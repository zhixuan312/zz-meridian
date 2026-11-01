// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launch, type Page } from '../scripts/lib/chrome.ts';

let page: Page;
let dir = '';
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-embed-theme-'));
  fs.copyFileSync(path.resolve(import.meta.dirname, '../src/styles/tokens.css'), path.join(dir, 'tokens.css'));
  page = await launch();
}, 60_000);
afterAll(() => { page?.close(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

async function appearance(attributes: string, scheme: 'light' | 'dark') {
  const file = path.join(dir, 'view.html');
  fs.writeFileSync(file, `<!doctype html><html ${attributes}><head><link rel="stylesheet" href="tokens.css"></head><body>Embed theme fixture</body></html>`);
  await page.open(`file://${file}`, { width: 400, theme: scheme, wait: 100 });
  return page.eval<{ surface: string; ink: string; ground: string }>(`(() => { const s = getComputedStyle(document.documentElement); return {surface:s.getPropertyValue('--surface').trim(), ink:s.getPropertyValue('--ink').trim(), ground:s.getPropertyValue('--ground').trim()}; })()`);
}

describe('embed theme bridge cascade', () => {
  it.each(['light', 'dark'] as const)('uses the %s system fallback while preserving transparent planes and host variables', async (scheme) => {
    const consoleTheme = await appearance('', scheme);
    const embed = await appearance('data-surface="embed"', scheme);
    expect(embed.surface).toBe(consoleTheme.surface);
    expect(embed.ink).toBe(consoleTheme.ink);
    expect(embed.ground).toBe('transparent');
    const host = await appearance('data-surface="embed" style="--color-background-primary:host-surface;--color-text-primary:host-ink"', scheme);
    expect(host.surface).toBe('host-surface');
    expect(host.ink).toBe('host-ink');
  }, 30_000);

  it.each([['light', 'dark'], ['dark', 'light']] as const)('honors an explicit %s host theme over a %s system scheme', async (theme, scheme) => {
    const baseline = await appearance(`data-theme="${theme}"`, scheme);
    const embed = await appearance(`data-surface="embed" data-theme="${theme}"`, scheme);
    expect(embed.surface).toBe(baseline.surface);
    expect(embed.ink).toBe(baseline.ink);
  }, 30_000);
});

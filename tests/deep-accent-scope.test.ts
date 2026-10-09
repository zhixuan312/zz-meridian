// @vitest-environment node
// Named deep-* so the payload leaves it out: it renders the generated tokens.css in a real Chrome, because the rule under
// test is the cascade's scope proximity, which no DOM emulation implements.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launch, type Page } from '../scripts/lib/chrome.ts';

const CSS = path.resolve(import.meta.dirname, '../src/styles/tokens.css');

/**
 * A preset whose values differ by theme (graphite; jade in dark) must take the nearest theme scope's values, whichever
 * way the theme and the accent are nested: [attributes on <html>, the markup holding #t, accent-l, on-accent, OS scheme].
 */
const CASES: [string, string, string, string, 'dark' | 'light'][] = [
  ['data-theme="light"', '<div id="t" data-theme="dark" data-accent="graphite"></div>', '0.95', '#0B0C12', 'dark'],
  ['data-theme="light"', '<div data-theme="dark"><div id="t" data-accent="graphite"></div></div>', '0.95', '#0B0C12', 'dark'],
  ['data-theme="dark" data-accent="graphite"', '<div id="t" data-theme="light"></div>', '0.22', '#FFFFFF', 'dark'],
  ['data-theme="dark"', '<div data-theme="light"><div id="t" data-accent="graphite"></div></div>', '0.22', '#FFFFFF', 'dark'],
  ['data-theme="light" data-accent="graphite"', '<div id="t" data-theme="dark" data-accent="indigo"></div>', '0.56', '#FFFFFF', 'dark'],
  ['data-accent="graphite"', '<div id="t"></div>', '0.95', '#0B0C12', 'dark'],
  ['data-theme="light" data-accent="graphite"', '<div id="t" data-theme="dark"></div>', '0.95', '#0B0C12', 'dark'],
  ['data-theme="dark" data-accent="jade"', '<div id="t" data-theme="light"></div>', '0.52', '#FFFFFF', 'dark'],
  ['data-theme="light"', '<div data-theme="dark" data-accent="graphite"><div data-theme="light"><div id="t" data-accent="graphite"></div></div></div>', '0.22', '#FFFFFF', 'dark'],
  ['data-accent="graphite"', '<div id="t"></div>', '0.22', '#FFFFFF', 'light'],
  ['data-accent="graphite"', '<div id="t" data-theme="dark"></div>', '0.95', '#0B0C12', 'light'],
  ['', '<div id="t" data-accent="graphite"></div>', '0.22', '#FFFFFF', 'light'],
  ['', '<div data-theme="dark"><div id="t" data-accent="graphite"></div></div>', '0.95', '#0B0C12', 'light'],
  ['data-accent="jade"', '<div id="t"></div>', '0.52', '#FFFFFF', 'light'],
];

let page: Page;
let dir = '';
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-scope-'));
  fs.copyFileSync(CSS, path.join(dir, 'tokens.css'));
  page = await launch();
}, 60_000);
afterAll(() => { page?.close(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

describe('a preset takes the nearest theme scope, nested either way', () => {
  it.each(CASES.map((c, i) => [i + 1, ...c] as const))('case %i: <html %s> %s', async (i, html, inner, l, on, scheme) => {
    const file = path.join(dir, `case-${i}.html`);
    fs.writeFileSync(file, `<!doctype html><html ${html}><head><link rel="stylesheet" href="tokens.css"></head><body>${inner}</body></html>`);
    await page.open(`file://${file}`, { width: 400, theme: scheme, wait: 100 });
    const got = await page.eval<string>(`(() => { const s = getComputedStyle(document.getElementById('t')); return s.getPropertyValue('--accent-l').trim() + ' ' + s.getPropertyValue('--on-accent').trim(); })()`);
    expect(got).toBe(`${l} ${on}`);
  }, 30_000);
});

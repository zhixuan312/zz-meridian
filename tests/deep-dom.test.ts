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

beforeAll(async () => {
  server = spawn(process.execPath, ['scripts/fixtures/deep/server.ts'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  const url = await new Promise<string>((resolve, reject) => {
    server.on('error', reject);
    server.stdout!.on('data', (d) => { const m = String(d).match(/listening on (\S+)/); if (m) resolve(m[1]); });
  });
  page = await launch();
  await page.open(`${url}/helper`, { width: 1000, wait: 300 });
  await page.eval(DEEP_SOURCE);
}, 60_000);

afterAll(() => {
  page?.close();
  server?.kill();
});

/** The nested host, which lives inside the outer root. */
const INNER = "document.getElementById('outer').shadowRoot.getElementById('inner')";

/** Evaluates `expression` in the helper page and returns its value. */
const run = <T>(expression: string) => page.eval<T>(expression);
/** The ids of the elements an expression returns (an element, an array of them, or null). */
const ids = (expression: string) => run<string | string[] | null>(`(() => { const v = ${expression}; const id = (e) => e ? (e.id || e.localName + (e.getAttribute('name') ? '[' + e.getAttribute('name') + ']' : '')) : null; return Array.isArray(v) ? v.filter((e) => e.id).map(id) : id(v); })()`);

describe('deepAll', () => {
  it('returns every element of the document and of every open root once, nested roots included, host first', async () => {
    expect(await ids('deepAll()')).toEqual(['plain', 's1', 'outer', 'o-section', 'inner', 'i-div', 'i-btn', 'i-span', 'o-btn', 'slotted', 'closed', 'light-input']);
    expect(await run<boolean>('(() => { const all = deepAll(); return new Set(all).size === all.length; })()')).toBe(true);
    // Everything the document query sees is in it, in the same relative order.
    expect(await run<boolean>(`(() => { const all = deepAll(); const doc = [...document.querySelectorAll('*')]; return doc.every((e) => all.includes(e)) && doc.map((e) => all.indexOf(e)).every((n, i, a) => !i || n > a[i - 1]); })()`)).toBe(true);
  });

  it('is deterministic', async () => {
    expect(await run<boolean>(`JSON.stringify(deepAll().map((e) => e.localName + e.id)) === JSON.stringify(deepAll().map((e) => e.localName + e.id))`)).toBe(true);
  });

  it('starts at a shadow root or an element when given one, and includes an element root', async () => {
    expect(await ids(`deepAll(document.getElementById('outer').shadowRoot)`)).toEqual(['o-section', 'inner', 'i-div', 'i-btn', 'i-span', 'o-btn']);
    expect(await ids(`deepAll(document.getElementById('outer'))`)).toEqual(['outer', 'o-section', 'inner', 'i-div', 'i-btn', 'i-span', 'o-btn', 'slotted']);
    expect(await ids(`deepAll(document.getElementById('s1'))`)).toEqual(['s1']);
  });

  it('does not enter a closed root', async () => {
    expect(await ids(`deepAll(document.getElementById('closed'))`)).toEqual(['closed']);
    expect(await run<boolean>(`deepAll().some((e) => e.id === 'hidden-inside')`)).toBe(false);
  });
});

describe('deepActive', () => {
  it('returns the focused element inside a nested root, and the light one outside', async () => {
    await run(`document.getElementById('light-input').focus()`);
    expect(await ids('deepActive()')).toBe('light-input');
    await run(`${INNER}.shadowRoot.getElementById('i-btn').focus()`);
    // The document itself reports only the outermost host.
    expect(await ids('document.activeElement')).toBe('outer');
    expect(await ids('deepActive()')).toBe('i-btn');
    await run(`document.getElementById('outer').shadowRoot.getElementById('o-btn').focus()`);
    expect(await ids('deepActive()')).toBe('o-btn');
  });
});

describe('deepQuery', () => {
  it('finds a match inside a root, in deepAll order', async () => {
    expect(await ids(`deepQuery('.dup')`)).toBe('i-span');
    expect(await ids(`deepQuery('#i-btn')`)).toBe('i-btn');
    expect(await ids(`deepQuery('#no-such-id')`)).toBeNull();
  });

  it('is scoped to the root given', async () => {
    expect(await ids(`deepQuery('.dup', document.getElementById('outer').shadowRoot)`)).toBe('i-span');
    expect(await ids(`deepQuery('#o-btn', ${INNER}.shadowRoot)`)).toBeNull();
    expect(await ids(`deepQuery('.dup', document.getElementById('slotted'))`)).toBeNull();
    expect(await ids(`deepQuery('#outer', document.getElementById('outer'))`)).toBe('outer');
  });

  it('keeps native combinators inside one tree: they never cross a shadow boundary', async () => {
    expect(await ids(`deepQuery('x-outer button')`)).toBeNull();
    expect(await ids(`deepQuery('x-inner #i-btn')`)).toBeNull();
    expect(await ids(`deepQuery('#o-section > #inner')`)).toBe('inner');
    expect(await ids(`deepQuery('#i-div > button')`)).toBe('i-btn');
  });

  it('does not return anything inside a closed root', async () => {
    expect(await ids(`deepQuery('#hidden-inside')`)).toBeNull();
    expect(await ids(`deepQuery('b')`)).toBeNull();
  });
});

describe('deepQueryAll', () => {
  it('returns every match inside the roots under the scope, in deepAll order', async () => {
    expect(await ids(`deepQueryAll('.dup')`)).toEqual(['i-span', 'o-btn']);
    expect(await ids(`deepQueryAll('button', document.getElementById('outer'))`)).toEqual(['i-btn', 'o-btn']);
    expect(await ids(`deepQueryAll('button', ${INNER})`)).toEqual(['i-btn']);
    expect(await run<number>(`deepQueryAll('#no-such-id').length`)).toBe(0);
  });

  it('finds nothing under a scope that was not found, rather than searching the whole page', async () => {
    expect(await run<number>(`deepQueryAll('button', document.querySelector('#no-such-scope')).length`)).toBe(0);
    expect(await ids(`deepQuery('button', document.querySelector('#no-such-scope'))`)).toBeNull();
  });
});

describe('deepParent', () => {
  it('steps from a slotted element to its slot, then through the root to the host', async () => {
    expect(await run<string>(`deepParent(document.getElementById('slotted')).localName`)).toBe('slot');
    expect(await ids(`deepParent(deepParent(document.getElementById('slotted')))`)).toBe('o-section');
    expect(await ids(`deepParent(document.getElementById('outer').shadowRoot.getElementById('o-section'))`)).toBe('outer');
  });

  it('steps from the top child of a nested root to its host, and from a light element to its parent', async () => {
    expect(await ids(`deepParent(${INNER}.shadowRoot.getElementById('i-div'))`)).toBe('inner');
    expect(await ids(`deepParent(${INNER})`)).toBe('o-section');
    expect(await ids(`deepParent(document.getElementById('s1'))`)).toBe('plain');
    expect(await run<string>(`deepParent(document.documentElement)`)).toBeNull();
  });
});

describe('open', () => {
  it('waits for the page to finish loading, not only for a fixed time', async () => {
    const base = await run<string>('location.origin');
    await page.open(`${base}/slow-load`, { width: 1000, wait: 300 });
    expect(await run<string>('document.readyState')).toBe('complete');
    await page.open(`${base}/helper`, { width: 1000, wait: 300 });
    await page.eval(DEEP_SOURCE);
  }, 60_000);
});

describe('deepText', () => {
  /** A host whose open root holds `<button><slot>fallback</slot> more</button>`, with `light` as its light content. */
  const text = (light: string, fallback = '') => run<string>(`(() => {
    const h = document.createElement('div');
    h.attachShadow({ mode: 'open' }).innerHTML = '<button><slot>${fallback}</slot> more</button>';
    h.innerHTML = '${light}';
    document.body.append(h);
    const t = deepText(h.shadowRoot.querySelector('button')).replace(/\\s+/g, ' ').trim();
    h.remove();
    return t;
  })()`);

  it("reads a control's text as rendered: what is slotted counts, and an empty slot shows its fallback", async () => {
    expect(await text('Export')).toBe('Export more');
    expect(await text('<b>Save</b> all')).toBe('Save all more');
    expect(await text('', 'Close')).toBe('Close more');
  });
});

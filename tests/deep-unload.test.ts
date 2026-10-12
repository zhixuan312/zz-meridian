// @vitest-environment node
// Named deep-* so the payload leaves it out: it drives a real browser through scripts/lib/chrome.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launch, type Page } from '../scripts/lib/chrome.ts';

/**
 * A page that holds unsaved changes asks the browser to warn before it unloads (the shell does, for a form section
 * that is dirty). A person answers that warning; a check has nobody to answer it, and while it stood the next
 * `open()` waited for an answer that never came: measured on Settings with a typed-in name, `Page.navigate timed out`
 * after 30 s. A check that opens another address has chosen to leave, so the helper answers for it.
 */
const html = (body: string) => `data:text/html,${encodeURIComponent(`<!doctype html><title>t</title>${body}`)}`;
const HOLDING = html(`<input aria-label="Name"><script>addEventListener('beforeunload', (e) => { e.preventDefault(); });</script>`);
const NEXT = html('<h1>Arrived</h1>');

let page: Page;
beforeAll(async () => { page = await launch(); }, 60_000);
afterAll(() => { page?.close(); });

describe('a check that leaves a page holding unsaved changes', () => {
  it('gets where it is going: the browser\'s own warning is answered, not waited on', async () => {
    await page.open(HOLDING, { width: 800, wait: 200 });
    // A real press and a real key: a browser warns only on a page the person has used.
    for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: 60, y: 20, button: 'left', clickCount: 1 });
    await page.send('Input.insertText', { text: 'Acme Ltd' });
    expect(await page.eval<string>(`document.querySelector('input').value`)).toBe('Acme Ltd');
    await page.open(NEXT, { width: 800, wait: 200 });
    expect(await page.eval<string>(`document.querySelector('h1')?.textContent ?? ''`)).toBe('Arrived');
  }, 60_000);
});

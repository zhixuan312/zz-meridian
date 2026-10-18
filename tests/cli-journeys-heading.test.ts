// @vitest-environment jsdom
// Named cli-* so the payload leaves it out: it reads the sample's own journeys.
import { describe, expect, it } from 'vitest';
import type { Page } from '../scripts/lib/chrome.ts';

/**
 * The journeys read a page's heading once the page is there, not while its `loading.tsx` stands in for it. The
 * loading masthead holds the page's name ("Customer") where the record's name will be, so a heading read while the
 * body was still busy failed the customer step on a loaded machine (`found a page headed "Customer:"`, the created
 * project's `--full --timed` in the consumer smoke).
 */
const page: Page = {
  errors: [],
  fileChoosers: () => 0,
  send: async () => undefined,
  shot: async () => 0,
  close: () => {},
  open: async () => {},
  eval: async <T,>(expression: string) => (0, eval)(expression) as T,
};

describe("a page's heading", () => {
  it('is read once the page has replaced its loading state', async () => {
    const { headingOf } = await import('../journeys/workspaces.ts');
    document.body.innerHTML = '<main><h1>Customer:</h1><div role="status" aria-busy="true" aria-label="Loading customer"></div></main>';
    setTimeout(() => { document.body.innerHTML = '<main><h1>Northwind Labs</h1><p>Every invoice.</p></main>'; }, 300);
    expect(await headingOf(page)).toBe('Northwind Labs');
  });
});

// @vitest-environment jsdom
// Named cli-* so the payload leaves it out: it walks the sample's own journeys, its workspaces and its personas.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '../scripts/lib/chrome.ts';

/**
 * `journeys/workspaces.ts`, which `pnpm verify --full` runs as a browser check, expects of a refused destination what
 * the product's `refusal` in `src/app.config.ts` chooses, as `pnpm verify --as` does: the no-access page under
 * `explain`, the missing page and no no-access page under `absent`. And each step is gated on the destinations it
 * walks, so a product that drops a page the step never opens still runs it.
 *
 * The journey is imported, which runs none of its steps; a destination is opened in this test's own document, from
 * markup, not in a browser.
 */
type Journey = typeof import('../journeys/workspaces.ts');

/** The journeys of a product whose `refusal` and navigation are the sample's, changed as given. */
async function journeys(change: { refusal?: 'explain' | 'absent'; drop?: string[] } = {}): Promise<Journey> {
  vi.resetModules();
  vi.doMock('../src/app.config.ts', async (original) => {
    const product = await original<typeof import('../src/app.config.ts')>();
    return {
      ...product,
      ...(change.refusal ? { refusal: change.refusal } : {}),
      nav: product.nav.map((g) => ({ ...g, items: g.items.filter((i) => !change.drop?.includes(i.href)) })),
    };
  });
  return import('../journeys/workspaces.ts');
}
afterEach(() => { vi.doUnmock('../src/app.config.ts'); });

// jsdom draws nothing, so it has no innerText; the text is what the journey reads it for.
if (!('innerText' in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, 'innerText', { get(this: HTMLElement) { return this.textContent; } });

/** A page that answers the journey's questions from `html`, as Chrome answers them from the served page. */
function served(html: string): Page {
  return {
    errors: [],
    fileChoosers: () => 0,
    send: async () => undefined,
    shot: async () => 0,
    close: () => {},
    open: async () => { document.body.innerHTML = html; },
    // In the global scope, as a page's own script is: the journey's questions read `document`.
    eval: async <T,>(expression: string) => (0, eval)(expression) as T,
  };
}

/** The no-access page a Viewer is given for Members under `explain`. */
const NO_ACCESS = '<main><h1>Members</h1><div data-no-access=""><p>You don\'t have access to Members</p><p>An Owner, an Admin or a Member can open it.</p><a href="/">Go to Home</a></div></main>';
/** The missing page the same address draws under `absent`: nothing on it names the page. */
const MISSING = '<main><p>404 · Not found</p><h1>This page isn’t here</h1><div data-missing-page=""><a href="/">Go to Home</a></div></main>';

/** The rail's Members entry, which a Viewer may not open. */
const members = async () => (await import('../src/app.config.ts')).nav.flatMap((g) => g.items).find((i) => i.href === '/members')!;

describe("a refused destination, as the product's refusal chooses", () => {
  it('under explain, is the no-access page that names it, and the missing page is not', async () => {
    const j = await journeys({ refusal: 'explain' });
    const item = await members();
    expect(await j.visit(served(NO_ACCESS), 'viewer', item, false)).toBeNull();
    expect(await j.visit(served(MISSING), 'viewer', item, false)).toMatch(/You don't have access to Members/);
  }, 30_000);

  it('under absent, is the missing page, and a no-access page is not', async () => {
    const j = await journeys({ refusal: 'absent' });
    const item = await members();
    expect(await j.visit(served(MISSING), 'viewer', item, false)).toBeNull();
    expect(await j.visit(served(NO_ACCESS), 'viewer', item, false)).toMatch(/missing page/);
    expect(await j.visit(served(`${MISSING.slice(0, -7)}<div data-no-access=""></div></main>`), 'viewer', item, false)).toMatch(/no no-access page/);
  }, 30_000);

  it('holds none of the records the persona may not read, under either', async () => {
    const j = await journeys({ refusal: 'absent' });
    const item = await members();
    expect(await j.visit(served(MISSING.replace('</main>', '<p>maya.chen@example.com</p></main>')), 'viewer', item, false)).toMatch(/maya\.chen@/);
  }, 30_000);
});

describe('the refresh, Back and Forward step', () => {
  it("is gated on the destinations it walks, Business's home among them, and not on Usage", async () => {
    const j = await journeys({ drop: ['/usage'] });
    expect(j.trail).toContain('/business');
    expect(j.trail).not.toContain('/usage');
    expect(j.missing(...j.trail)).toBeNull();
    const without = await journeys({ drop: ['/business'] });
    expect(without.missing(...without.trail)).toMatch(/\/business/);
  });
});

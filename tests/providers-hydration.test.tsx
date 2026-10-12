import { lazy, Suspense, type ComponentType } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Providers, usePreferences } from '@/components/base/providers';
import { STORAGE_KEY } from '@/lib/preferences';

/**
 * The server's HTML for a part whose code arrives later (a `dynamic()` card, a lazy panel) stays on the page until that
 * code is there. Reading the stored choices on mount is an update above every such part; made urgently, React answers it
 * by throwing the server's HTML away and drawing the boundary's fallback until the code loads, so a page that had
 * arrived whole empties and fills again. Measured on the Atlas, where a card's specimen is such a part: every card page
 * shifted 0.3 to 0.6 against a 0.1 bar on a mid-range phone.
 *
 * Hydrated as a browser does it, on React's own schedule and not inside `act`, which flushes work in an order no page
 * sees.
 */
function Specimen() {
  usePreferences();
  return <p data-testid="specimen">A specimen</p>;
}

const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let act: boolean | undefined;
beforeAll(() => { act = env.IS_REACT_ACT_ENVIRONMENT; env.IS_REACT_ACT_ENVIRONMENT = false; });
afterAll(() => { env.IS_REACT_ACT_ENVIRONMENT = act; });

const settle = () => new Promise((r) => setTimeout(r, 60));
let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(async () => {
  root?.unmount();
  await settle();
  host?.remove();
  localStorage.clear();
  for (const a of ['data-theme', 'data-accent', 'data-density']) document.documentElement.removeAttribute(a);
});

/** Hydrates the server's HTML with a specimen whose code has not loaded yet, and reports whether it was ever taken off the page. */
async function hydrateBeforeItsCode() {
  host = document.body.appendChild(document.createElement('div'));
  // Inside a page, as it always is: an element between the provider and the boundary is what React skips over when
  // nothing in it changed, and where it then looks for readers of the changed context.
  host.innerHTML = renderToString(<Providers><main><Suspense><Specimen /></Suspense></main></Providers>);
  const served = host.querySelector('[data-testid="specimen"]')!;
  let removed = false;
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if (n === served || n.contains(served)) removed = true; }).observe(host, { subtree: true, childList: true });
  let load: (() => void) | undefined;
  const Late = lazy(() => new Promise<{ default: ComponentType }>((r) => { load = () => r({ default: Specimen }); }));
  root = hydrateRoot(host, <Providers><main><Suspense><Late /></Suspense></main></Providers>);
  // Hydration has reached the boundary once it has asked for the specimen's code. On a busy machine that is later than
  // any fixed wait (one run of the whole suite found it had not yet, after 60 ms), so wait for the asking itself.
  for (let i = 0; i < 100 && !load; i++) await settle();
  await settle();
  const before = { removed, there: host.contains(served) };
  load!();
  await settle();
  return { before, after: { removed, there: host.contains(served) } };
}

describe('reading the stored choices on mount', () => {
  it('leaves the server\'s HTML in place while a part\'s code is still on its way', async () => {
    const { before, after } = await hydrateBeforeItsCode();
    expect(before).toEqual({ removed: false, there: true });
    expect(after).toEqual({ removed: false, there: true });
  });

  it('does the same for a person with a stored choice, and that choice is on the root', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'light' }));
    const { before, after } = await hydrateBeforeItsCode();
    expect(before).toEqual({ removed: false, there: true });
    expect(after).toEqual({ removed: false, there: true });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

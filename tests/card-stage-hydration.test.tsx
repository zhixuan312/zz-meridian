import { PassThrough } from 'node:stream';
import { lazy, type ComponentType, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * A card page arrives with its specimen drawn, and the specimen's code arrives after it (`dynamic()`). The stage learns
 * the page's theme and accent as it hydrates, so for a reader who is not on the defaults it renders again at once, before
 * that code is there. Measured on a mid-range phone, with the light theme: the specimen left the page and came back, and
 * every card page shifted 0.6 against a 0.1 bar. The reader on the defaults is tests/providers-hydration.test.tsx.
 *
 * Hydrated as a browser does it, on React's own schedule and not inside `act`.
 */
// Outside Next's own bundler `next/dynamic` resolves to the Pages Router's loader, which draws nothing on the server and
// swaps the component in from state. The App Router's is a `lazy` component under the caller's Suspense (see
// next/dist/shared/lib/lazy-dynamic/loadable.js), and that is the one the Atlas is served by, so it is the one stood in.
vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<{ default: ComponentType }>) => {
    const Lazy = lazy(load);
    return function Loadable() { return <Lazy />; };
  },
}));

const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let act: boolean | undefined;
beforeAll(() => {
  act = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = false;
  // jsdom has no matchMedia; the stage asks it for the system's scheme when the root names no theme.
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});
afterAll(() => { env.IS_REACT_ACT_ENVIRONMENT = act; });

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(async () => {
  root?.unmount();
  await new Promise((r) => setTimeout(r, 30));
  host?.remove();
  for (const a of ['data-theme', 'data-accent']) document.documentElement.removeAttribute(a);
});

/** The server's HTML once every part of it has arrived, as a prerendered page holds it. */
const served = (el: ReactElement) => new Promise<string>((resolve, reject) => {
  let html = '';
  const out = new PassThrough();
  out.on('data', (c) => { html += c; });
  out.on('end', () => resolve(html));
  const stream = renderToPipeableStream(el, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject });
});

async function hydrateFor(look: { theme?: string; accent?: string }) {
  const { CardStage } = await import('@/system/card-stage');
  host = document.body.appendChild(document.createElement('div'));
  host.innerHTML = await served(<CardStage id="components/badge" />);
  const specimen = host.querySelector('[data-specimen]')!;
  const drawn = specimen.firstElementChild!;
  expect(drawn).toBeTruthy();
  let removed = false;
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if (n === drawn || n.contains(drawn)) removed = true; }).observe(host, { subtree: true, childList: true });
  // The reader's look is on the root before the page hydrates (the pre-paint script), and the browser has not loaded
  // the preview's code yet: a fresh copy of the registry, whose previews are still to be imported.
  if (look.theme) document.documentElement.setAttribute('data-theme', look.theme);
  if (look.accent) document.documentElement.setAttribute('data-accent', look.accent);
  vi.resetModules();
  const fresh = await import('@/system/card-stage');
  root = hydrateRoot(host, <fresh.CardStage id="components/badge" />);
  const checked = () => host!.querySelector('[role="radiogroup"][aria-label="Theme"] [aria-checked="true"]')?.textContent;
  // Hydrated, and the stage shows the reader's theme; then long enough for the preview's code to arrive.
  for (let i = 0; i < 100 && checked() !== (look.theme === 'light' ? 'Light' : 'Dark'); i++) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 300));
  return { theme: checked(), removed, there: host.contains(drawn) };
}

describe('a card stage, hydrating before its preview\'s code has arrived', () => {
  it('keeps the specimen the server drew for a reader in the light theme', async () => {
    expect(await hydrateFor({ theme: 'light' })).toEqual({ theme: 'Light', removed: false, there: true });
  });

  it('keeps it for a reader with another accent', async () => {
    expect(await hydrateFor({ accent: 'teal' })).toEqual({ theme: 'Dark', removed: false, there: true });
  });
});

// Named cli-* so the payload leaves it out: it is about the sample's own Home, which a product replaces.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

import HomePage from '../app/(dashboard)/(home)/page';
import HomeLoading from '../app/(dashboard)/(home)/loading';
import { servedDocument } from './served';

/** Home as it is served, every boundary resolved. */
async function served(): Promise<Document> {
  const element = (await HomePage({ searchParams: Promise.resolve({ period: '30d' }) })) as ReactElement;
  return servedDocument(element);
}
const loading = () => new DOMParser().parseFromString(renderToStaticMarkup(<Tooltip.Provider><HomeLoading /></Tooltip.Provider>), 'text/html');

/** An element as its box is built: its tag and its classes. */
const shape = (el: Element | null | undefined) => (el ? `${el.tagName.toLowerCase()}.${[...el.classList].sort().join('.')}` : 'none');
/** The masthead's second row, the one under the heading: the sentence under the title, the freshness and the actions. */
function row(doc: Document) {
  const masthead = doc.getElementById('content')!;
  const second = masthead.children[1];
  const room = second.querySelector('[data-lead-room]');
  // From the row down to the room's own box, each element the sentence stands in.
  const chain: string[] = [];
  for (let el: Element | null = room?.firstElementChild ?? null; el && el !== masthead; el = el.parentElement) chain.unshift(shape(el));
  const beside = [...second.children].find((c) => !c.contains(room));
  // A streamed page marks where a boundary resolved with a `template`, which draws no box: it is not one of the row's items.
  return { chain, beside: shape(beside), meta: shape(beside?.firstElementChild), items: [...(beside?.children ?? [])].filter((c) => c.tagName !== 'TEMPLATE').map(shape) };
}

describe("Home's masthead, while it loads and once it has arrived", () => {
  it('builds the row under the heading the same way: the sentence\'s room, the freshness and as many actions', async () => {
    const [pending, arrived] = [row(loading()), row(await served())];
    expect(pending.chain.length).toBeGreaterThan(3);
    expect(pending.chain).toEqual(arrived.chain);
    expect([pending.beside, pending.meta]).toEqual([arrived.beside, arrived.meta]);
    // The freshness, then the period control and Export: three of the row's items either way.
    expect(pending.items).toHaveLength(3);
    expect(arrived.items).toHaveLength(3);
  });

  it('keeps no margin a placeholder could carry out of the sentence\'s room', () => {
    const room = loading().querySelector('[data-lead-room]')!.firstElementChild!;
    expect(room.className).toMatch(/(^|\s)flow-root(\s|$)/);
  });
});

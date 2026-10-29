// A helper of the tests, not a test: vitest collects only *.test.* files, so it is never run on its own.
import { PassThrough } from 'node:stream';
import { Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

/**
 * A page's HTML as its request is answered once every part of it has arrived. Every boundary is written in place, as the
 * page reads once a browser has run its scripts: a large boundary is otherwise written after the root, outside the
 * frame, and its fallback stands where it will be. The root layout's providers hold the tooltips' one provider, which a
 * page drawn alone has to be given.
 */
export function served(page: ReactNode): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{page}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
}

/** The same page read as a document, where a test runs with a DOM. */
export async function servedDocument(page: ReactNode): Promise<Document> {
  return new DOMParser().parseFromString(await served(page), 'text/html');
}

/** A document's text, one text node from the next by a space, so a heading and the sentence after it stay two words. */
export function textOf(doc: Document): string {
  const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) parts.push(n.textContent ?? '');
  return parts.join(' ');
}

// Named cli-* so the payload leaves it out with the tests that use it; not a test, so vitest does not collect it.
import { PassThrough } from 'node:stream';
import { Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

/**
 * A page as its request is answered once every part of it has arrived, read as a document. Every boundary is written in
 * place, as the page reads once a browser has run its scripts: a large boundary is otherwise written after the root,
 * outside the frame, and its fallback stands where it will be. The root layout's providers hold the tooltips' one
 * provider, which a page drawn alone has to be given.
 */
export async function servedDocument(page: ReactNode): Promise<Document> {
  const html = await new Promise<string>((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (chunk) => { text += chunk; });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(<Tooltip.Provider>{page}</Tooltip.Provider>, { onAllReady: () => stream.pipe(out), onShellError: reject, onError: reject, progressiveChunkSize: Infinity });
  });
  return new DOMParser().parseFromString(html, 'text/html');
}

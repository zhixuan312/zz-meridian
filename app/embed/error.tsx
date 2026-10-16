'use client';

import { app } from '@/app.config';

/**
 * The last net in an embed: something threw that the page's own read did not catch (a view that fails to render). It
 * imports nothing else, and that is the design, not an oversight.
 *
 * Measured: an error boundary here that drew the view's frame and an empty state cost 28 KiB on every embed route's
 * first load — `/embed/now` went 14 KiB past the 820 KiB budget and all three embeds grew 5.8–7.7% — while the same
 * boundary importing nothing costs none of it, because a segment's error boundary lands in the route's entry chunk and
 * everything it imports lands with it. So the framed failure is the page's own (it catches a read that threw and draws
 * the frame and a card), and this is the document underneath it: the product's name, one sentence, and Try again.
 * `app.config` is the one import, and it is already in the entry chunk of every route that draws the product's mark.
 */
export default function EmbedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col items-start justify-center gap-3 p-8">
      <p className="t-kicker">{app.name}</p>
      <p className="text-sm text-ink">This view did not load, and nothing was changed.</p>
      <button
        type="button"
        onClick={reset}
        className="press hit rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:bg-fill-hover"
      >
        Try again
      </button>
    </main>
  );
}

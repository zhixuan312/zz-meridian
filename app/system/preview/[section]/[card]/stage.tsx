'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { lazy, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PREVIEW_LOADERS } from '@/system/preview-loaders';

/** One lazy component per card, made once: the route's first load carries none of them, and the page loads only its own. */
const PREVIEWS = Object.fromEntries(Object.entries(PREVIEW_LOADERS).map(([id, load]) => [id, lazy(load)]));

function Inner({ id }: { id: string }) {
  const q = useSearchParams();
  const P = PREVIEWS[id];
  // The card's own name, from its folder: the stage knows the id and not the title, and importing the Atlas's content
  // reading to draw one word would weigh more than the word.
  const slug = id.split('/').at(-1)!.replace(/-/g, ' ');
  const label = slug[0].toUpperCase() + slug.slice(1);
  return (
    <div
      data-theme={q.get('theme') ?? undefined}
      data-accent={q.get('accent') ?? undefined}
      data-density={q.get('density') ?? undefined}
      className="min-h-dvh bg-ground p-8 text-ink max-sm:p-4"
    >
      {/* The card page opens this in a new tab, which has no history to go back through: without a link here the only
          way off a preview is to close the tab. One quiet line above the specimen, naming the card it belongs to. */}
      <nav className="mx-auto mb-6 flex max-w-5xl items-center">
        <Link href={`/system/${id}`} className="press hit inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 hover:bg-fill-hover hover:text-ink">
          <ArrowLeft className="size-3.5" /> {label}
        </Link>
      </nav>
      <div data-specimen className="mx-auto max-w-5xl"><Suspense><P /></Suspense></div>
    </div>
  );
}

export function PreviewStage({ id }: { id: string }) {
  return <Suspense><Inner id={id} /></Suspense>;
}

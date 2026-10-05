'use client';

import { useSearchParams } from 'next/navigation';
import { lazy, Suspense } from 'react';
import { PREVIEW_LOADERS } from '@/system/preview-loaders';

/** One lazy component per card, made once: the route's first load carries none of them, and the page loads only its own. */
const PREVIEWS = Object.fromEntries(Object.entries(PREVIEW_LOADERS).map(([id, load]) => [id, lazy(load)]));

function Inner({ id }: { id: string }) {
  const q = useSearchParams();
  const P = PREVIEWS[id];
  return (
    <div
      data-theme={q.get('theme') ?? undefined}
      data-accent={q.get('accent') ?? undefined}
      data-density={q.get('density') ?? undefined}
      className="min-h-dvh bg-ground p-8 text-ink max-sm:p-4"
    >
      <div className="mx-auto max-w-5xl"><Suspense><P /></Suspense></div>
    </div>
  );
}

export function PreviewStage({ id }: { id: string }) {
  return <Suspense><Inner id={id} /></Suspense>;
}

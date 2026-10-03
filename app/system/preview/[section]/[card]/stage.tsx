'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CARDS } from '@/system/registry';

function Inner({ id }: { id: string }) {
  const q = useSearchParams();
  const c = CARDS.find((x) => `${x.section}/${x.id}` === id)!;
  const P = c.Preview!;
  return (
    <div
      data-theme={q.get('theme') ?? undefined}
      data-accent={q.get('accent') ?? undefined}
      data-density={q.get('density') ?? undefined}
      className="min-h-dvh bg-ground p-8 text-ink max-sm:p-4"
    >
      <div className="mx-auto max-w-5xl">
        <P />
      </div>
    </div>
  );
}

export function PreviewStage({ id }: { id: string }) {
  return <Suspense><Inner id={id} /></Suspense>;
}

'use client';

import { Specimen, State } from '@/system/specimen';
import { Card } from '@/components/ui/card';
import { Skeleton } from '.';

export default function SkeletonPreview() {
  return (
    <>
      <Specimen label="Shapes" note="Text lines are the height of the text; figures and charts take their own size.">
        <State label="Line" className="w-48"><Skeleton className="w-full" /></State>
        <State label="Short line" className="w-48"><Skeleton className="w-24" /></State>
        <State label="Figure" className="w-48"><Skeleton className="h-10 w-28 rounded-sm" /></State>
        <State label="Avatar"><Skeleton className="size-8 rounded-full" /></State>
      </Specimen>
      <Specimen label="A loading tile" note="Built from the same Card and spacing as the tile, so nothing moves when the data lands." stack>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-(--card-pad)" aria-busy>
            <Skeleton className="w-24" />
            <Skeleton className="mt-4 h-10 w-32 rounded-sm" />
            <Skeleton className="mt-3 w-40" />
            <Skeleton className="mt-5 h-10 w-full rounded-sm" />
          </Card>
          <Card className="p-(--card-pad)" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="flex-1" />
                <Skeleton className="w-12" />
              </div>
            ))}
          </Card>
        </div>
      </Specimen>
    </>
  );
}

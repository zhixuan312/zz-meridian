import type { ReactNode } from 'react';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The frame every console route's loading state shares: one masthead skeleton, then the page's own body, announced once
 * as busy under the page's name. Each route's `loading.tsx` composes its body from these rows, in the shape of its page.
 */
export function LoadingPage({ name, children }: { name: string; children: ReactNode }) {
  return (
    <PageFrame kicker={<Skeleton className="h-2.5 w-32" />} title={<Skeleton className="mt-3 h-10 w-64 rounded-md" />} description={<Skeleton className="mt-2 h-3.5 w-96 max-w-full" />}>
      <div role="status" aria-busy="true" aria-label={`Loading ${name}`} className="contents">
        <Stack>{children}</Stack>
      </div>
    </PageFrame>
  );
}

/** A row of three metric tiles. */
export function TilesSkeleton() {
  return (
    <Row split="tiles">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-3 p-(--card-pad)">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="mt-auto h-8 w-full" />
        </Card>
      ))}
    </Row>
  );
}

/** A card with a title and a chart-sized block. */
export function ChartSkeleton({ height = 'h-40' }: { height?: string }) {
  return (
    <Card className="gap-4 p-(--card-pad)">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64 max-w-full" />
      <Skeleton className={`${height} w-full rounded-md`} />
    </Card>
  );
}

/** A card holding a data table: a filter bar over `rows` rows. */
export function TableSkeleton({ rows = 8, filters = true }: { rows?: number; filters?: boolean }) {
  return (
    <Card className="gap-4 p-(--card-pad)">
      {filters ? (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      ) : null}
      <Skeleton className="h-3 w-full" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-4" />)}
    </Card>
  );
}

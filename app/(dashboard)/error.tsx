'use client';

import Link from 'next/link';
import { RotateCw } from 'lucide-react';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * A page that failed to load: in place, inside the shell, so the rail and the way out stay where they were. The title
 * says what happened once; the card says what to do about it, with the reference support will ask for.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageFrame kicker="Something failed" title="This view did not load" description="The data behind it did not arrive. Nothing was changed." width="reading">
      <Card className="arrive">
        <EmptyState
          kind="error"
          title="Retrying usually works"
          action={
            <>
              <Button variant="primary" icon={<RotateCw />} onClick={reset}>Retry</Button>
              <Button asChild><Link href="/health">Check Health</Link></Button>
            </>
          }
        >
          If it fails again, Health says whether an incident is under way. Reference <span className="font-mono text-ink">{error.digest ?? 'client'}</span>
        </EmptyState>
      </Card>
    </PageFrame>
  );
}

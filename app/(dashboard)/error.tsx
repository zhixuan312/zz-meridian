'use client';

import { RotateCw } from 'lucide-react';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** A page that failed to load: in place, inside the shell, so the rail and the way out stay where they were. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageFrame kicker="Something failed" title="This view did not load" description="The data behind it did not arrive. Nothing was changed; retrying usually works.">
      <Card className="py-16">
        <EmptyState kind="error" title="We could not load this view" action={<Button variant="primary" icon={<RotateCw />} onClick={reset}>Retry</Button>}>
          If it keeps failing, check Health for an incident. Reference: <span className="font-mono">{error.digest ?? 'client'}</span>
        </EmptyState>
      </Card>
    </PageFrame>
  );
}

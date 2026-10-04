'use client';

import Link from 'next/link';
import { RotateCw } from 'lucide-react';
import { nav } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * A page that failed to load: in place, inside the shell, so the rail and the way out stay where they were. The title
 * says what happened once; the card says what to do about it, with the reference support will ask for.
 *
 * The second way out is read from `nav`, never written here: not every product has a Health page, and one that does not
 * would otherwise offer a button to an address that leads nowhere while the reader is already having a bad day.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const items = nav.flatMap((g) => g.items);
  const health = items.find((i) => i.href === '/health');
  const home = items.find((i) => i.href === '/');
  const elsewhere = health ?? home;
  return (
    <PageFrame kicker="Something failed" title="This view did not load" description="The data behind it did not arrive. Nothing was changed.">
      <Card className="arrive">
        <EmptyState
          kind="error"
          title="Retrying usually works"
          action={
            <>
              <Button variant="primary" icon={<RotateCw />} onClick={reset}>Retry</Button>
              {elsewhere ? <Button asChild><Link href={elsewhere.href}>{health ? `Check ${health.label}` : `Go to ${elsewhere.label}`}</Link></Button> : null}
            </>
          }
        >
          {health ? `If it fails again, ${health.label} says whether an incident is under way.` : 'If it fails again, it is likely to stay that way until someone looks at the data behind it.'} Reference <span className="font-mono text-ink">{error.digest ?? 'client'}</span>
        </EmptyState>
      </Card>
    </PageFrame>
  );
}

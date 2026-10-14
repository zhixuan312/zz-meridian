'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricTile } from '@/components/patterns/metric-tile';

/**
 * A part whose read failed: its card, with its title, says what could not be read in its own place, and the rest of
 * the page stands. `what` is the read in words, as the data names it ("the usage by model"). Home and Revenue draw it.
 */
export function Unread({ title, what }: { title: string; what: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <EmptyState kind="error" layout="inline" title={`${what.replace(/^./, (s) => s.toUpperCase())} could not be read`}>
          What it states is missing, not zero. The rest of the page is unaffected.
        </EmptyState>
      </CardBody>
    </Card>
  );
}

/** A tile whose figure could not be read: its name, a dash and why. Nothing is drawn as if it were zero. */
export const unreadTile = (label: string, hint?: string) => <MetricTile key={label} label={label} hint={hint} value="—" note="Could not be read" />;

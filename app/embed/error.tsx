'use client';

import { RotateCw } from 'lucide-react';
import { EmbedFrame } from '@/components/patterns/embed-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * An MCP App view whose read threw. A host frames this document, so the failure is drawn here instead of being left to
 * the host's own error shell, which knows nothing about the product: the frame stays, and the card says what happened
 * and offers the one thing worth pressing.
 *
 * That is Retry, and it is this boundary's own: `reset` re-renders the segment and the read runs again. The way out is
 * the frame's, not this card's — "Open in ZZ Meridian" goes through the host's link bridge, while a link here would
 * navigate the host's own frame to the console, which is not what a guest view may do to the page around it.
 */
export default function EmbedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmbedFrame title="This view did not load" consolePath="/" expandable={false}>
      <Card className="arrive">
        <EmptyState
          kind="error"
          title="Retrying usually works"
          action={<Button variant="primary" icon={<RotateCw />} onClick={reset}>Retry</Button>}
        >
          The data behind this view did not arrive. Nothing was changed. Reference <span className="font-mono text-ink">{error.digest ?? 'client'}</span>
        </EmptyState>
      </Card>
    </EmbedFrame>
  );
}

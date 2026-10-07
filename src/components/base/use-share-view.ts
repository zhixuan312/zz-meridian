'use client';

import { useEffect } from 'react';
import { useSurface } from '@/components/base/surface';
import { contextText, type SharedContext } from '@/lib/shared-context';

/**
 * Tell both agents what the person is looking at (decision 0011): one shared context per view, the whole state every
 * time. In an MCP host it goes to the model through `ui/update-model-context` (debounced, only once a host answered);
 * on the console the assistant reads it with the person's next question. It is re-sent whenever it changes: a filter,
 * the period, the day the Meridian points at.
 */
export function useShareView(context: SharedContext) {
  const { kind, share, connected } = useSurface();
  const text = contextText(context);
  const key = JSON.stringify(context);
  useEffect(() => {
    if (kind === 'embed' && !connected) return;
    const t = setTimeout(() => share(text, context), kind === 'embed' ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, kind, connected, share]);
}

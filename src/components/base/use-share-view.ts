'use client';

import { useEffect } from 'react';
import { useSurface } from '@/components/base/surface';

/**
 * Keep the model told what the person is looking at. Call it once per view with a sentence and the structured facts;
 * it re-sends whenever they change (a filter, the period, the Meridian's day). On the console it does nothing.
 */
export function useShareView(text: string, structured: Record<string, unknown>) {
  const { share, connected } = useSurface();
  const key = JSON.stringify(structured);
  useEffect(() => {
    if (!connected) return;
    const t = setTimeout(() => share(text, structured), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, key, connected]);
}

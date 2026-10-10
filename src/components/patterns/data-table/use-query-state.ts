'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useOptimistic, useTransition } from 'react';

/**
 * A view's state, kept in its address. Every key is a query parameter; a key at its default is left out of the URL,
 * so the plain address is the default view. A person shares the link and an agent opens the same view by calling a
 * tool with the same names. Writes replace the history entry and never scroll.
 */
export function useQueryState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void, boolean] {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const key = JSON.stringify(defaults);
  const state = useMemo(() => {
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = params.get(k);
      if (v !== null) (out as Record<string, string>)[k] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, key]);
  // The address changes only when the navigation commits, which waits on the server; until then the state a press asked
  // for is shown at once, so a sort arrow or a page number answers the press, and `pending` says the rows are on their way.
  const [pending, startTransition] = useTransition();
  const [shown, show] = useOptimistic(state, (cur: T, patch: Partial<T>) => {
    const out = { ...cur };
    for (const [k, v] of Object.entries(patch)) (out as Record<string, string>)[k] = v === undefined || v === '' ? (defaults[k] ?? '') : (v as string);
    return out;
  });
  const set = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
        else next.set(k, v as string);
      }
      const q = next.toString();
      startTransition(() => {
        show(patch);
        router.replace(q ? `${path}?${q}` : path, { scroll: false });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, path, router, key],
  );
  return [shown, set, pending];
}

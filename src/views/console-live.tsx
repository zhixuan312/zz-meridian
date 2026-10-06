'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshCollections } from '@/data/live-actions';
import { LiveProvider } from '@/lib/live';

type Ready = { scopeKey: string; pollMs?: number };

/**
 * `?livePollMs=` is a test hook: the live check shortens the safety poll with it. Any visitor can type it, and each poll
 * refreshes the tenant's collections, so it never goes under a second.
 */
export function pollFromAddress(search: string): number | undefined {
  const ms = Number(new URLSearchParams(search).get('livePollMs'));
  return ms > 0 ? Math.max(1000, ms) : undefined;
}

/** Waits for the caller's scope in its own boundary and reports it, so the page never waits and its children never remount. */
function ResolveScope({ scope, onReady }: { scope: Promise<string>; onReady: (ready: Ready) => void }) {
  const scopeKey = use(scope);
  useEffect(() => {
    onReady({ scopeKey, pollMs: pollFromAddress(window.location.search) });
  }, [scopeKey, onReady]);
  return null;
}

/** Every console page's live data: one stream per tab, opened once the scope has resolved. A refresh reauthorizes the names, then reads the route again; a refusal throws a 401 the provider pauses on. */
export function ConsoleLive({ scope, children }: { scope: Promise<string>; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState<Ready>({ scopeKey: '' });
  const refresh = async (names: string[]) => {
    const result = await refreshCollections(names);
    if (!result.ok) throw Object.assign(new Error('Sign in to see live data.'), { status: result.status });
    router.refresh();
  };
  return (
    <LiveProvider refresh={refresh} scopeKey={ready.scopeKey} pollMs={ready.pollMs}>
      <Suspense fallback={null}>
        <ResolveScope scope={scope} onReady={setReady} />
      </Suspense>
      {children}
    </LiveProvider>
  );
}

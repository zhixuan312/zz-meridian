'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshCollections } from '@/data/live-actions';
import { LiveProvider } from '@/lib/live';

type Ready = { scopeKey: string; pollMs?: number };

/** Waits for the caller's scope in its own boundary and reports it, so the page never waits and its children never remount. */
function ResolveScope({ scope, onReady }: { scope: Promise<string>; onReady: (ready: Ready) => void }) {
  const scopeKey = use(scope);
  useEffect(() => {
    // `?livePollMs=` is a test hook: the live check shortens the safety poll with it.
    const ms = Number(new URLSearchParams(window.location.search).get('livePollMs'));
    onReady({ scopeKey, pollMs: ms > 0 ? ms : undefined });
  }, [scopeKey, onReady]);
  return null;
}

/** Every console page's live data: one stream per tab, opened once the scope has resolved. A refresh reauthorizes the names, then reads the route again. */
export function ConsoleLive({ scope, children }: { scope: Promise<string>; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState<Ready>({ scopeKey: '' });
  const refresh = async (names: string[]) => {
    await refreshCollections(names);
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

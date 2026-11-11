'use client';

import { app } from '@/app.config';

/**
 * The door's last net. Sign-in is the only way into a gated product, and a read that throws here (the roster, the
 * password gate) reached Next's own error page: no product name, no retry, nothing a person could do. It imports only
 * `app.config`, which the page's own entry chunk already carries.
 */
export default function SignInError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col items-start justify-center gap-3 p-8">
      <p className="t-kicker">{app.name}</p>
      <p className="text-sm text-ink">Sign-in did not load. Try again, or come back in a moment.</p>
      <button
        type="button"
        onClick={retry}
        className="press hit rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:bg-fill-hover"
      >
        Try again
      </button>
    </main>
  );
}

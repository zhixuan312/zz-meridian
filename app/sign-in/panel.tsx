'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** The sign-in panel: one field, one primary action, SSO beside it. A sent link replaces the form, never a toast. */
export function SignInPanel() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Enter your work email, like maya@relay.dev.');
    setError(undefined);
    setState('sending');
    setTimeout(() => setState('sent'), 900);
  };
  return (
    <section aria-labelledby="sign-in" className="relative overflow-hidden rounded-xl border border-line bg-surface/80 p-7 shadow-overlay backdrop-blur-xl sm:p-8">
      <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent-ink/60 to-transparent" />
      {state === 'sent' ? (
        <div role="status">
          <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><Mail className="size-5" /></span>
          <h2 id="sign-in" className="t-section mt-5">Check your inbox</h2>
          <p className="t-small mt-2 text-ink-2">We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. It works once, for 15 minutes.</p>
          <Button variant="ghost" className="mt-6 -ml-3.5" onClick={() => setState('idle')}>Use another email</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h2 id="sign-in" className="t-section">Sign in</h2>
          <p className="t-small mt-2 text-ink-2">New to Relay? Your first workspace is free.</p>
          <div className="mt-7 flex flex-col gap-4">
            <Field label="Work email" error={error}>
              {(p) => <Input {...p} type="email" size="lg" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} />}
            </Field>
            <Button type="submit" variant="primary" size="lg" block busy={state === 'sending'} trailing={<ArrowRight />}>Continue with email</Button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Button size="lg" block icon={<KeyRound />}>Continue with SSO</Button>
          <p className="t-caption mt-6 text-pretty">By continuing you agree to the Terms and the Privacy notice. We never post anything for you.</p>
        </form>
      )}
    </section>
  );
}

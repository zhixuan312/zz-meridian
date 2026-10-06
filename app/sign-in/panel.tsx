'use client';

import { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { app, domain } from '@/app.config';
import { demoSignIn } from './actions';

/** The panel's surface, shared by both panels and the placeholder that holds their place while one streams in. */
export function PanelFrame({ children }: { children?: ReactNode }) {
  return (
    <section aria-labelledby={children ? 'sign-in' : undefined} aria-hidden={children ? undefined : true} className="relative overflow-hidden rounded-xl border border-line bg-surface/80 p-7 shadow-overlay backdrop-blur-xl sm:p-8">
      <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent-ink/60 to-transparent" />
      {children ?? <div className="min-h-[22rem]" />}
    </section>
  );
}

/** The demo's panel, when `DEMO_PASSWORD` is set: one password field and one primary action. */
export function PasswordPanel() {
  const [state, action, pending] = useActionState(demoSignIn, { error: false });
  return (
    <PanelFrame>
      <form action={action}>
        <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><LockKeyhole className="size-5" /></span>
        <h2 id="sign-in" className="t-section mt-5">Open the demo</h2>
        <p className="t-small mt-2 text-ink-2">{app.name} on sample data. Enter the password you were given.</p>
        <input type="text" name="username" value="demo" autoComplete="username" readOnly hidden />
        <div className="mt-7 flex flex-col gap-4">
          <Field label="Demo password" error={state.error ? 'That is not the demo password.' : undefined}>
            {(p) => <Input {...p} name="password" type="password" size="lg" autoComplete="current-password" required autoFocus leading={<KeyRound className="size-4" />} />}
          </Field>
          <Button type="submit" variant="primary" size="lg" block busy={pending} trailing={<ArrowRight />}>Open the demo</Button>
        </div>
      </form>
    </PanelFrame>
  );
}

/** The sign-in panel: one field, one primary action, SSO beside it. A sent link replaces the form, never a toast. */
export function SignInPanel() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'sso'>('idle');
  const valid = () => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid()) return setError(`Enter your work email, like maya@${domain}.`);
    setError(undefined);
    setState('sending');
    setTimeout(() => setState('sent'), 900);
  };
  /** SSO starts from the email too: its domain names the company's identity provider. */
  const sso = () => {
    if (!valid()) return setError(`Enter your work email to find your company's sign-in.`);
    setError(undefined);
    setState('sso');
  };
  return (
    <PanelFrame>
      {state === 'sent' ? (
        <div role="status">
          <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><Mail className="size-5" /></span>
          <h2 id="sign-in" className="t-section mt-5">Check your inbox</h2>
          <p className="t-small mt-2 text-ink-2">We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. It works once, for 15 minutes.</p>
          <Button variant="ghost" className="mt-6 -ml-3.5" onClick={() => setState('idle')}>Use another email</Button>
        </div>
      ) : state === 'sso' ? (
        <div role="status">
          <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><KeyRound className="size-5" /></span>
          <h2 id="sign-in" className="t-section mt-5">Opening your company&rsquo;s sign-in</h2>
          <p className="t-small mt-2 text-ink-2">
            <span className="font-medium text-ink">{email.split('@')[1]}</span> signs in through its identity provider. Finish there and you come straight back here.
          </p>
          <Button variant="ghost" className="mt-6 -ml-3.5" onClick={() => setState('idle')}>Use another email</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h2 id="sign-in" className="t-section">Sign in</h2>
          <p className="t-small mt-2 text-ink-2">New to {app.name}? Your first workspace is free.</p>
          <div className="mt-7 flex flex-col gap-4">
            <Field label="Work email" error={error}>
              {(p) => <Input {...p} type="email" size="lg" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} />}
            </Field>
            <Button type="submit" variant="primary" size="lg" block busy={state === 'sending'} trailing={<ArrowRight />}>Continue with email</Button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Button size="lg" block icon={<KeyRound />} onClick={sso}>Continue with SSO</Button>
          <p className="t-caption mt-6 text-pretty">By continuing you agree to the Terms and the Privacy notice. We never post anything for you.</p>
        </form>
      )}
    </PanelFrame>
  );
}

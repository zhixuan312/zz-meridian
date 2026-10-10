'use client';

import { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, CircleAlert, KeyRound, LockKeyhole, Mail, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { CONTROL_SIZE, controlFrame, Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { app, domain } from '@/app.config';
import { demoSignIn, signInAs, type SignInAsState } from './actions';

/** One person the demo can be opened as, as the sign-in surfaces show them: the name and role, and whether they may be chosen. */
export type Persona = { id: string; name: string; role: string; disabled: boolean };

/** The panel's surface, shared by every panel and the placeholder that holds their place while one streams in. */
export function PanelFrame({ children, labelledBy = 'sign-in' }: { children?: ReactNode; /** The heading each panel's section is labelled by; one per panel, so two on a page never share an id. */ labelledBy?: string }) {
  return (
    <section aria-labelledby={children ? labelledBy : undefined} aria-hidden={children ? undefined : true} className="relative overflow-hidden rounded-xl border border-line bg-surface/80 p-7 shadow-overlay backdrop-blur-xl sm:p-8">
      <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent-ink/60 to-transparent" />
      {children ?? <div className="min-h-[22rem]" />}
    </section>
  );
}

/** The demo's panel, when `DEMO_PASSWORD` is set: the password, then who to open as, and one primary action. */
export function PasswordPanel({ personas }: { personas: Persona[] }) {
  const [state, action, pending] = useActionState(demoSignIn, { error: false });
  return (
    <PanelFrame>
      <form action={action}>
        <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><LockKeyhole className="size-5" /></span>
        <h2 id="sign-in" className="t-section mt-5">Open the demo</h2>
        <p className="t-small mt-2 text-ink-2">{app.name} on sample data. Enter the password you were given, and who to open as.</p>
        <input type="text" name="username" value="demo" autoComplete="username" readOnly hidden />
        <div className="mt-7 flex flex-col gap-4">
          <Field label="Demo password" error={state.error ? 'That is not the demo password.' : undefined}>
            {(p) => <Input {...p} name="password" type="password" size="lg" autoComplete="current-password" required autoFocus leading={<KeyRound className="size-4" />} />}
          </Field>
          <Field label="Open as" hint="You can change this any time from the rail.">
            {(p) => (
              /* A native select: the same frame as every other field, and no script on the sign-in route for a choice the browser already knows how to make. */
              <div className={cn('relative flex w-full min-w-0 items-center', controlFrame, CONTROL_SIZE.lg)}>
                <select {...p} name="persona" defaultValue={personas[0]?.id} className="h-full w-full min-w-0 appearance-none truncate bg-transparent pr-7 outline-none focus-visible:outline-none">
                  {personas.map((one) => <option key={one.id} value={one.id} disabled={one.disabled}>{one.name} — {one.role}</option>)}
                </select>
                <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 shrink-0 text-ink-3" />
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" block busy={pending} trailing={<ArrowRight />}>Open the demo</Button>
        </div>
      </form>
    </PanelFrame>
  );
}

/** The demo without a password: the people it can be opened as, each one opening the console as that person. */
export function PersonaPanel({ personas }: { personas: Persona[] }) {
  const [state, action, pending] = useActionState(signInAs, {} as SignInAsState);
  return (
    <PanelFrame labelledBy="choose-persona">
      <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><Users className="size-5" /></span>
      <h2 id="choose-persona" className="t-section mt-5">Open the demo as</h2>
      <p className="t-small mt-2 text-ink-2">Pick who to be. The console answers as that person, from what they may see and do.</p>
      {state.error ? (
        <p role="alert" className="mt-4 flex items-start gap-1.5 text-xs leading-snug text-critical-ink"><CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2} />{state.error}</p>
      ) : null}
      <ul className="mt-6 flex flex-col gap-2">
        {personas.map((one) => (
          <li key={one.id}>
            <form action={action}>
              <input type="hidden" name="persona" value={one.id} />
              <button
                type="submit"
                disabled={one.disabled || pending}
                className="press hit group/row flex w-full items-center gap-3 rounded-lg border border-line bg-surface/60 p-3 text-left transition-[background-color,border-color,transform] duration-(--dur-hover) hover:border-line-strong hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:bg-surface/60"
              >
                <Avatar name={one.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{one.name}</span>
                  <span className="block truncate text-xs text-ink-3">{one.disabled ? `${one.role} · Not active` : one.role}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-3" />
              </button>
            </form>
          </li>
        ))}
      </ul>
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

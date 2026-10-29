'use client';

import { useActionState, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, CircleAlert, KeyRound, LockKeyhole, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { CONTROL_SIZE, controlFrame, Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { demoSignIn, signInAs, type SignInAsState } from './actions';

/** One person the console can be opened as, as the sign-in surfaces show them: the name and role, and whether they may be chosen. */
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

/** The panel when `DEMO_PASSWORD` is set: the password, then who to sign in as, and one primary action. */
export function PasswordPanel({ personas }: { personas: Persona[] }) {
  const [state, action, pending] = useActionState(demoSignIn, { error: null });
  return (
    <PanelFrame>
      <form action={action}>
        <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><LockKeyhole className="size-5" /></span>
        <h2 id="sign-in" className="t-section mt-5">Sign in</h2>
        <p className="t-small mt-2 text-ink-2">Enter the password you were given, and who to sign in as.</p>
        <input type="text" name="username" value="demo" autoComplete="username" readOnly hidden />
        <div className="mt-7 flex flex-col gap-4">
          <Field label="Password" error={state.error === 'password' ? 'That is not the password.' : undefined}>
            {(p) => <Input {...p} name="password" type="password" size="lg" autoComplete="current-password" required autoFocus leading={<KeyRound className="size-4" />} />}
          </Field>
          <Field label="Sign in as" hint="You can change this any time from the rail." error={state.error === 'persona' ? "That person can't be signed in as right now. Choose another." : undefined}>
            {(p) => (
              /* A native select: the same frame as every other field, and no script on the sign-in route for a choice the browser already knows how to make.
                 React resets the form after a refused sign-in, and a select's default is set only when it mounts, so it
                 mounts again on the person the action hands back. */
              <div className={cn('relative flex w-full min-w-0 items-center', controlFrame, CONTROL_SIZE.lg)}>
                <select {...p} key={state.persona} name="persona" defaultValue={state.persona ?? personas[0]?.id} className="h-full w-full min-w-0 appearance-none truncate bg-transparent pr-7 outline-none focus-visible:outline-none">
                  {personas.map((one) => <option key={one.id} value={one.id} disabled={one.disabled}>{one.name} — {one.role}</option>)}
                </select>
                <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 shrink-0 text-ink-3" />
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" block busy={pending} trailing={<ArrowRight />}>Sign in</Button>
        </div>
      </form>
    </PanelFrame>
  );
}

/** Without a password: the people the console can be opened as, each row signing in as that person. */
export function PersonaPanel({ personas }: { personas: Persona[] }) {
  const [state, action, pending] = useActionState(signInAs, {} as SignInAsState);
  return (
    <PanelFrame labelledBy="choose-persona">
      <span className="grid size-11 place-items-center rounded-full bg-accent-tint text-accent-ink"><Users className="size-5" /></span>
      <h2 id="choose-persona" className="t-section mt-5">Sign in as</h2>
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

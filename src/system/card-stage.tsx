'use client';

import { Suspense, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENTS, type Preferences } from '@/lib/preferences';
import { CARDS } from '@/system/registry';
import { Segmented } from '@/components/ui/segmented';
import { app } from '@/app.config';

type Accent = (typeof ACCENTS)[number];

type ThemeView = 'dark' | 'light' | 'both';
type Width = 'fluid' | 'phone';


/** Tokens re-scoped on a subtree: the stage shows a card in any theme, accent and density without leaving the page. */
export type Density = Preferences['density'];

/** Without a theme or an accent, a scope keeps the page's own, through the cascade, so nothing swaps after the first paint. */
export function Scope({ theme, accent, density, children, className }: { theme?: 'dark' | 'light'; accent?: Accent; density: Density; children: ReactNode; className?: string }) {
  return (
    <div data-theme={theme} data-accent={accent} data-density={density} className={cn('relative isolate overflow-hidden bg-ground text-ink', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-(image:--glow-ground) opacity-70" />
      {children}
    </div>
  );
}

const LIGHT = '(prefers-color-scheme: light)';
function subscribe(changed: () => void) {
  const watch = new MutationObserver(changed);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
  const scheme = matchMedia(LIGHT);
  scheme.addEventListener('change', changed);
  return () => { watch.disconnect(); scheme.removeEventListener('change', changed); };
}
const pageTheme = (): 'dark' | 'light' => {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' || t === 'dark' ? t : matchMedia(LIGHT).matches ? 'light' : 'dark';
};
const pageAccent = (): Accent => document.documentElement.getAttribute('data-accent') ?? app.accent;

/**
 * A stage's theme and accent: the page's own until the reader picks one, so a reader in the light theme first sees
 * the light specimen. `scoped` is what a Scope is given: undefined while the stage follows the page.
 */
export function useStageLook() {
  const page = {
    theme: useSyncExternalStore(subscribe, pageTheme, () => 'dark' as const),
    accent: useSyncExternalStore(subscribe, pageAccent, () => app.accent as Accent),
  };
  const [theme, setTheme] = useState<ThemeView | null>(null);
  const [accent, setAccent] = useState<Accent | null>(null);
  return {
    theme: theme ?? page.theme, setTheme, accent: accent ?? page.accent, setAccent,
    scoped: { theme: theme === null ? undefined : theme === 'both' ? undefined : theme, accent: accent ?? undefined },
  };
}

/** A stage toolbar: the controls that re-scope what is shown below them. */
export function StageBar({ theme, setTheme, accent, setAccent, density, setDensity, extra, both = true }: {
  theme: ThemeView; setTheme: (t: ThemeView) => void; accent: Accent; setAccent: (a: Accent) => void; density?: Density; setDensity?: (d: Density) => void; extra?: ReactNode;
  /** Whether the stage can show both themes at once; a framed page shows one. */
  both?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line bg-surface/70 px-4 py-3 backdrop-blur-md">
      <Segmented size="sm" label="Theme" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, ...(both ? [{ value: 'both' as const, label: 'Both' }] : [])]} />
      <div role="radiogroup" aria-label="Accent" className="flex items-center gap-1">
        {ACCENTS.map((a) => (
          <button key={a} role="radio" aria-checked={accent === a} aria-label={a} title={a[0].toUpperCase() + a.slice(1)} onClick={() => setAccent(a)} className="press hit grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink-2">
            <span data-accent={a} className="size-4 rounded-full bg-accent ring-1 ring-line" />
          </button>
        ))}
      </div>
      {density && setDensity ? (
        <Segmented size="sm" label="Density" value={density} onChange={setDensity} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
      ) : null}
      <div className="ml-auto flex items-center gap-2">{extra}</div>
    </div>
  );
}

export function CardStage({ id }: { id: string }) {
  const card = CARDS.find((c) => `${c.section}/${c.id}` === id);
  const { theme, setTheme, accent, setAccent, scoped } = useStageLook();
  const [density, setDensity] = useState<Density>('comfortable');
  const [width, setWidth] = useState<Width>('fluid');
  if (!card?.Preview) return null;
  const P = card.Preview;
  const pane = (t: 'dark' | 'light') => (
    <Scope key={t} theme={theme === 'both' ? t : scoped.theme} accent={scoped.accent} density={density} className="px-5 py-8 sm:px-10">
      {theme === 'both' ? <p className="t-kicker mb-6">{t}</p> : null}
      {/* A specimen, not the page: its own headings and scroll regions are the card's (a Detail head is an h1 where it is used), so the audit keeps them out of the page's outline and its one scroller (issue #8). */}
      <div data-specimen className={cn('mx-auto', width === 'phone' ? 'max-w-[390px]' : 'max-w-none')}><Suspense><P /></Suspense></div>
    </Scope>
  );
  return (
    <section aria-labelledby="card-preview" className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <h2 id="card-preview" className="sr-only">Preview</h2>
      <StageBar
        theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} density={density} setDensity={setDensity}
        extra={
          <>
            <Segmented size="sm" label="Width" value={width} onChange={setWidth} options={[{ value: 'fluid', label: 'Fluid' }, { value: 'phone', label: '390' }]} />
            <a href={`/system/preview/${id}`} target="_blank" className="press grid size-8 place-items-center rounded-md text-ink-3 hover:bg-fill-hover hover:text-ink" aria-label="Open the preview on its own">
              <ExternalLink className="size-4" />
            </a>
          </>
        }
      />
      {theme === 'both' ? <div className="divide-y divide-line">{pane('dark')}{pane('light')}</div> : pane(theme)}
    </section>
  );
}

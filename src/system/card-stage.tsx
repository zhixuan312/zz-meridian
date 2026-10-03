'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENTS, type Accent, type Density, ACCENT_SWATCH } from '@/lib/preferences';
import { CARDS } from '@/system/registry';
import { Segmented } from '@/components/ui/segmented';

type ThemeView = 'dark' | 'light' | 'both';
type Width = 'fluid' | 'phone';

const SWATCH = ACCENT_SWATCH;

/** Tokens re-scoped on a subtree: the stage shows a card in any theme, accent and density without leaving the page. */
export function Scope({ theme, accent, density, children, className }: { theme: 'dark' | 'light'; accent: Accent; density: Density; children: ReactNode; className?: string }) {
  return (
    <div data-theme={theme} data-accent={accent} data-density={density} className={cn('relative isolate overflow-hidden bg-ground text-ink', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-(image:--glow-ground) opacity-70" />
      {children}
    </div>
  );
}

/** A stage toolbar: the controls that re-scope what is shown below them. */
export function StageBar({ theme, setTheme, accent, setAccent, density, setDensity, extra }: {
  theme: ThemeView; setTheme: (t: ThemeView) => void; accent: Accent; setAccent: (a: Accent) => void; density?: Density; setDensity?: (d: Density) => void; extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line bg-surface/70 px-4 py-3 backdrop-blur-md">
      <Segmented size="sm" label="Theme" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'both', label: 'Both' }]} />
      <div role="radiogroup" aria-label="Accent" className="flex items-center gap-1">
        {ACCENTS.map((a) => (
          <button key={a} role="radio" aria-checked={accent === a} aria-label={a} title={a[0].toUpperCase() + a.slice(1)} onClick={() => setAccent(a)} className="press grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink-2">
            <span className="size-4 rounded-full ring-1 ring-line" style={{ background: SWATCH[a] }} />
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
  const [theme, setTheme] = useState<ThemeView>('dark');
  const [accent, setAccent] = useState<Accent>('indigo');
  const [density, setDensity] = useState<Density>('comfortable');
  const [width, setWidth] = useState<Width>('fluid');
  if (!card?.Preview) return null;
  const P = card.Preview;
  const pane = (t: 'dark' | 'light') => (
    <Scope key={t} theme={t} accent={accent} density={density} className="px-5 py-8 sm:px-10">
      {theme === 'both' ? <p className="t-kicker mb-6">{t}</p> : null}
      <div className={cn('mx-auto', width === 'phone' ? 'max-w-[390px]' : 'max-w-none')}><Suspense><P /></Suspense></div>
    </Scope>
  );
  return (
    <section aria-label="Preview" className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
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

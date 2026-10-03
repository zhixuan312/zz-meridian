'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { over, parse, ratio, type RGBA } from '@/lib/color';
import type { Accent, Density } from '@/lib/preferences';
import { Scope, StageBar } from '@/system/card-stage';
import type { TokenGroup } from '@/system/tokens-data';
import { app } from '@/app.config';

type Groups = { core: TokenGroup[]; theme: TokenGroup[]; compact: TokenGroup[] };

/** Read resolved colours inside a scope: a probe element takes `var(--<token>)` and the browser resolves it. */
function useResolved(names: string[], deps: unknown[]) {
  const root = useRef<HTMLDivElement>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // One probe per token: a single probe restyled in a loop can report the previous value.
    const probes = names.map((n) => {
      const p = document.createElement('span');
      p.style.color = `var(--${n})`;
      el.appendChild(p);
      return [n, p] as const;
    });
    const out: Record<string, string> = {};
    for (const [n, p] of probes) out[n] = getComputedStyle(p).color;
    probes.forEach(([, p]) => p.remove());
    setVals(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [root, vals] as const;
}

const safe = (v?: string): RGBA | null => {
  try { return v ? parse(v) : null; } catch { return null; }
};
const short = (v = '') => v.replace(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)( \/ ([\d.]+))?\)/, (_, l, c, h, __, a) => `oklch ${(+l).toFixed(2)} ${(+c).toFixed(3)} ${Math.round(+h)}${a ? ` / ${(+a).toFixed(2)}` : ''}`).replace(/^rgba?\((.+)\)$/, 'rgb $1');

export function TokenView({ view, groups }: { view: string; groups: Groups }) {
  const [theme, setTheme] = useState<'dark' | 'light' | 'both'>('dark');
  const [accent, setAccent] = useState<Accent>('indigo');
  const [density, setDensity] = useState<Density>('comfortable');
  const panes = theme === 'both' ? (['dark', 'light'] as const) : ([theme] as const);
  const body = (t: 'dark' | 'light') => {
    switch (view) {
      case 'colour': return <Colour groups={groups.theme} theme={t} accent={accent} />;
      case 'data': return <DataColour theme={t} accent={accent} />;
      case 'type': return <Type groups={groups.core} />;
      case 'space': return <Space groups={groups} density={density} />;
      case 'elevation': return <Elevation />;
      case 'motion': return <Motion groups={groups.core} />;
      default: return null;
    }
  };
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <StageBar theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} density={view === 'space' ? density : undefined} setDensity={view === 'space' ? setDensity : undefined} />
      <div className={cn(theme === 'both' && 'divide-y divide-line')}>
        {panes.map((t) => (
          <Scope key={t} theme={t} accent={accent} density={density} className="px-5 py-8 sm:px-10">
            {theme === 'both' ? <p className="t-kicker mb-6">{t}</p> : null}
            {body(t)}
          </Scope>
        ))}
      </div>
    </section>
  );
}

function Colour({ groups, theme, accent }: { groups: TokenGroup[]; theme: string; accent: string }) {
  const shown = groups.filter((g) => !['chart', 'elevation'].includes(g.id));
  const names = shown.flatMap((g) => g.tokens.filter((t) => t.type === 'color').map((t) => t.name)).concat(['ground', 'surface']);
  const [root, v] = useResolved(names, [theme, accent]);
  const ground = safe(v.ground), surface = safe(v.surface);
  return (
    <div ref={root} className="flex flex-col gap-12">
      {shown.map((g) => (
        <section key={g.id}>
          <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="t-section">{g.title}</h2>
            <p className="t-small max-w-[60ch] text-ink-2">{g.about}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.tokens.filter((t) => t.type === 'color').map((t) => {
              const c = safe(v[t.name]);
              const onSurface = c && ground && surface ? ratio(over(c, over(surface, ground)), over(surface, ground)) : null;
              return (
                <div key={t.name} className="flex gap-3.5 rounded-lg border border-line bg-surface p-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-md border border-line bg-[conic-gradient(var(--fill-track)_25%,transparent_0_50%,var(--fill-track)_0_75%,transparent_0)] bg-size-[10px_10px]">
                    <span className="absolute inset-0" style={{ background: `var(--${t.name})` }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium text-ink">{t.name}</p>
                    <p className="mt-0.5 truncate font-mono text-2xs text-ink-3" title={v[t.name]}>{short(v[t.name])}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-ink-2">{t.description}</p>
                  </div>
                  {onSurface && /^(ink|accent-ink|positive-ink|warning-ink|critical-ink|accent|positive|warning|critical|line-control)/.test(t.name) ? (
                    <span className={cn('t-num self-start rounded-sm px-1.5 py-0.5 font-mono text-2xs', onSurface >= 4.5 ? 'bg-positive-tint text-positive-ink' : onSurface >= 3 ? 'bg-fill-track text-ink-2' : 'bg-critical-tint text-critical-ink')} title="Contrast on surface">
                      {onSurface.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function DataColour({ theme, accent }: { theme: string; accent: string }) {
  const series = [1, 2, 3, 4, 5, 6].map((i) => `series-${i}`);
  const [root, v] = useResolved([...series, 'surface', 'ground'], [theme, accent]);
  const heights = [0.62, 0.84, 0.48, 0.71, 0.93, 0.55, 0.77, 0.4, 0.66, 0.88, 0.58, 0.74];
  return (
    <div ref={root} className="flex flex-col gap-12">
      <section>
        <h2 className="t-section">Categorical slots</h2>
        <p className="t-small mt-2 max-w-[62ch] text-ink-2">Six hues in a fixed order, validated for colour-vision deficiency in both themes. Assign them in order; a seventh series folds into Other. Text never takes a series colour.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {series.map((s, i) => (
            <div key={s} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-20" style={{ background: `var(--${s})` }} />
              <div className="p-3">
                <p className="font-mono text-xs text-ink">{s}</p>
                <p className="mt-0.5 font-mono text-2xs text-ink-3">{short(v[s])}</p>
                <p className="t-caption mt-1">Slot {i + 1}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="t-section">The neutral population</h2>
        <p className="t-small mt-2 max-w-[62ch] text-ink-2">When one mark is the point, every other mark is neutral and the one takes the accent. The eye lands where the colour is.</p>
        <div className="mt-6 flex h-40 items-end gap-1.5 rounded-lg border border-line bg-surface p-5">
          {heights.map((h, i) => (
            <span key={i} className="flex-1 rounded-t-xs" style={{ height: `${h * 100}%`, background: i === 4 ? 'var(--accent)' : 'var(--chart-neutral)' }} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="t-section">Status</h2>
        <p className="t-small mt-2 max-w-[62ch] text-ink-2">Positive, warning and critical mean good, attention and bad, and nothing else. They always come with a word or an icon.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(['positive', 'warning', 'critical'] as const).map((s) => (
            <div key={s} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: `var(--${s})` }} /><span className="font-mono text-xs">{s}</span></div>
              <p className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `var(--${s}-tint)`, color: `var(--${s}-ink)` }}>{s === 'positive' ? 'Operational' : s === 'warning' ? 'Degraded' : 'Outage'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const ROLES: [string, string, string][] = [
  ['t-display', 'Display', 'One line of meaning.'],
  ['t-hero', 'Hero figure', '2.94M'],
  ['t-page', 'Page title', 'Overview'],
  ['t-section', 'Section', 'Busiest endpoints'],
  ['t-figure', 'Figure', '0.90%'],
  ['t-card', 'Card title', 'Requests per day'],
  ['t-lead', 'Lead', 'Traffic, reliability and spend across every endpoint.'],
  ['t-body', 'Body', 'Requests that reached the gateway, including those that failed.'],
  ['t-small', 'Small', 'Share of requests answered with a 5xx or a 429.'],
  ['t-caption', 'Caption', 'Updated 4 min ago'],
  ['t-kicker', 'Kicker', `${app.name} · ${app.workspace}`],
  ['t-eyebrow', 'Eyebrow', 'Operate'],
  ['t-mono', 'Mono', 'req_6a0x1fq3b2 · POST /v1/messages'],
];

function Type({ groups }: { groups: TokenGroup[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [spec, setSpec] = useState<Record<string, string>>({});
  useEffect(() => {
    const out: Record<string, string> = {};
    root.current?.querySelectorAll<HTMLElement>('[data-role]').forEach((el) => {
      const c = getComputedStyle(el);
      out[el.dataset.role!] = `${Math.round(parseFloat(c.fontSize))}px · ${c.fontWeight} · ${c.fontFamily.includes('Mono') ? 'mono' : 'sans'}${c.letterSpacing !== 'normal' ? ` · ${(parseFloat(c.letterSpacing) / parseFloat(c.fontSize)).toFixed(3)}em` : ''}`;
    });
    setSpec(out);
  }, []);
  const type = groups.find((g) => g.id === 'type');
  return (
    <div ref={root} className="flex flex-col">
      {ROLES.map(([cls, name, sample]) => (
        <div key={cls} className="grid items-baseline gap-x-8 gap-y-2 border-t border-line py-6 first:border-0 first:pt-0 md:grid-cols-[11rem_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-xs text-ink">.{cls}</p>
            <p className="t-caption mt-1">{name}</p>
            <p className="mt-1 font-mono text-2xs text-ink-3">{spec[cls]}</p>
          </div>
          <p data-role={cls} className={cn(cls, 'min-w-0 truncate', cls === 't-display' && 'text-[clamp(40px,6vw,88px)]')}>{sample}</p>
        </div>
      ))}
      {type ? <p className="t-caption mt-8 max-w-[62ch]">{type.about}</p> : null}
    </div>
  );
}

function Space({ groups, density }: { groups: Groups; density: Density }) {
  const space = groups.core.find((g) => g.id === 'space')!;
  const radius = groups.core.find((g) => g.id === 'radius')!;
  const control = groups.core.find((g) => g.id === 'control')!;
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section>
        <h2 className="t-section">The 4px scale</h2>
        <div className="mt-5 flex flex-col gap-2.5">
          {space.tokens.map((t) => (
            <div key={t.name} className="flex items-center gap-4">
              <span className="w-20 shrink-0 font-mono text-xs text-ink-2">{t.name}</span>
              <span className="h-3 rounded-xs bg-accent" style={{ width: `var(--${t.name})` }} />
              <span className="t-caption truncate">{t.description}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="t-section">Radius</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {radius.tokens.map((t) => (
            <div key={t.name} className="flex flex-col items-start gap-2">
              <span className="size-16 border border-accent-line bg-accent-tint" style={{ borderRadius: `min(var(--${t.name}), 32px)` }} />
              <span className="font-mono text-xs">{t.name}</span>
            </div>
          ))}
        </div>
        <h2 className="t-section mt-12">Controls · {density}</h2>
        <div className="mt-5 flex flex-col gap-3">
          {control.tokens.filter((t) => t.name.startsWith('control')).map((t) => (
            <div key={t.name} className="flex items-center gap-4">
              <span className="w-24 shrink-0 font-mono text-xs text-ink-2">{t.name}</span>
              <span className="flex w-48 items-center rounded-md border border-line-strong bg-surface px-3 text-sm text-ink-2 shadow-control" style={{ height: `var(--${t.name})` }}>Search requests</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Elevation() {
  const items: [string, ReactNode][] = [
    ['shadow-card', 'A card: hairline first'],
    ['shadow-raise', 'An interactive card under the pointer'],
    ['shadow-overlay', 'Menus, dialogs, toasts'],
    ['shadow-halo', 'The featured card: a faint halo and a lit edge']
  ];
  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="t-section">Three planes</h2>
        <p className="t-small mt-2 max-w-[62ch] text-ink-2">The ground carries the light; a card sits one step toward the reader; what floats sits above everything. Depth comes from the planes, hairlines and light, not from stacked borders.</p>
        <div className="mt-6 rounded-xl border border-line bg-ground p-6">
          <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
            <p className="t-eyebrow">Surface</p>
            <div className="mt-4 max-w-72 rounded-lg bg-surface-raised p-4 shadow-overlay"><p className="t-eyebrow">Raised</p><p className="t-small mt-1 text-ink-2">A menu or a toast.</p></div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([n, d]) => (
          <div key={n} className={cn('rounded-lg border border-line bg-surface p-5', n === 'shadow-halo' && 'edge-lit')} style={{ boxShadow: `var(--${n})` }}>
            <p className="font-mono text-xs">{n}</p>
            <p className="t-caption mt-2">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Motion({ groups }: { groups: TokenGroup[] }) {
  const motion = groups.find((g) => g.id === 'motion')!;
  const [go, setGo] = useState(0);
  const curves = motion.tokens.filter((t) => t.type === 'cubicBezier');
  const durations = motion.tokens.filter((t) => t.type === 'duration');
  const bez: Record<string, number[]> = { 'ease-out': [0.16, 1, 0.3, 1], 'ease-in-out': [0.65, 0, 0.35, 1], 'ease-spring': [0.34, 1.36, 0.5, 1] };
  return (
    <div className="flex flex-col gap-12">
      <p className="t-small max-w-[62ch] text-ink-2">{motion.about}</p>
      <section className="grid gap-4 md:grid-cols-3">
        {curves.map((t) => {
          const [a, b, c, d] = bez[t.name] ?? [0, 0, 1, 1];
          return (
            <button key={t.name} type="button" onClick={() => setGo((g) => g + 1)} className="rounded-lg border border-line bg-surface p-5 text-left hover:border-line-strong">
              <svg viewBox="-0.1 -0.5 1.2 2" className="h-32 w-full overflow-visible">
                <path d="M0 1 L1 1 M0 1 L0 0" stroke="var(--chart-grid)" strokeWidth="0.01" fill="none" />
                <path d={`M0 1 C${a} ${1 - b} ${c} ${1 - d} 1 0`} stroke="var(--accent)" strokeWidth="0.025" fill="none" strokeLinecap="round" />
              </svg>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-fill-track">
                <span key={go} className="block h-full w-full origin-left rounded-full bg-accent" style={{ animation: `m-grow-x 900ms cubic-bezier(${a},${b},${c},${d}) both` }} />
              </div>
              <p className="mt-4 font-mono text-xs">{t.name}</p>
              <p className="t-caption mt-1">{t.description}</p>
            </button>
          );
        })}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {durations.map((t) => (
          <div key={t.name} className="rounded-lg border border-line bg-surface p-4">
            <p className="font-mono text-xs">{t.name}</p>
            <p className="t-figure mt-2">{parseInt(t.value)}<span className="unit">ms</span></p>
            <p className="t-caption mt-2">{t.description}</p>
          </div>
        ))}
      </section>
      <p className="t-caption">Press a curve to replay it.</p>
    </div>
  );
}

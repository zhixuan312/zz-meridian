'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ACCENTS } from '@/lib/preferences';
import { useSize } from '@/components/charts/use-size';
import { Segmented } from '@/components/ui/segmented';
import { StageBar } from '@/system/card-stage';
import { app, domain } from '@/app.config';

type Accent = (typeof ACCENTS)[number];

type Surface = 'console' | 'phone' | 'embed';

/** Apply theme and accent to a same-origin frame without touching the reader's own stored preferences. */
function dress(frame: HTMLIFrameElement | null, theme: 'dark' | 'light', accent: Accent) {
  const d = frame?.contentDocument?.documentElement;
  if (!d || d.getAttribute('data-surface') === 'embed') return;
  d.setAttribute('data-theme', theme);
  d.setAttribute('data-accent', accent);
}

export function PageStage({ route, embed, title }: { route: string; embed?: string; title: string }) {
  const [surface, setSurface] = useState<Surface>(route.startsWith('/embed') ? 'embed' : 'console');
  const [theme, setTheme] = useState<'dark' | 'light' | 'both'>('dark');
  const [accent, setAccent] = useState<Accent>('indigo');
  const t = theme === 'both' ? 'dark' : theme;
  const options = [
    ...(route.startsWith('/embed') ? [] : [{ value: 'console' as const, label: 'Console' }, { value: 'phone' as const, label: 'Phone' }]),
    ...(embed ? [{ value: 'embed' as const, label: 'MCP host' }] : []),
  ];
  return (
    <section aria-label={`${title} on every surface`} className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <StageBar
        theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent}
        extra={options.length > 1 ? <Segmented size="sm" label="Surface" value={surface} onChange={setSurface} options={options} /> : null}
      />
      <div className="relative isolate overflow-hidden bg-ground px-4 py-8 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-(image:--glow-ground)" />
        {surface === 'console' ? <ConsoleFrame route={route} theme={t} accent={accent} /> : null}
        {surface === 'phone' ? <PhoneFrame route={route} theme={t} accent={accent} /> : null}
        {surface === 'embed' && embed ? <HostSimulator route={embed} theme={t} /> : null}
      </div>
    </section>
  );
}

function ConsoleFrame({ route, theme, accent }: { route: string; theme: 'dark' | 'light'; accent: Accent }) {
  const [box, { width }] = useSize<HTMLDivElement>();
  const frame = useRef<HTMLIFrameElement>(null);
  const W = 1440, H = 900, scale = width ? Math.min(1, width / W) : 0;
  useEffect(() => dress(frame.current, theme, accent), [theme, accent]);
  return (
    <div ref={box} className="w-full">
      <div className="overflow-hidden rounded-lg border border-line-strong shadow-overlay">
        <div className="flex h-8 items-center gap-3 border-b border-line bg-surface-sunk px-3">
          <span className="flex gap-1.5"><span className="size-2.5 rounded-full bg-fill-active" /><span className="size-2.5 rounded-full bg-fill-active" /><span className="size-2.5 rounded-full bg-fill-active" /></span>
          <span className="mx-auto truncate rounded-sm bg-fill-hover px-3 py-0.5 font-mono text-2xs text-ink-3">app.{domain}{route}</span>
        </div>
        <div style={{ height: H * scale }} className="relative overflow-hidden">
          {scale ? (
            <iframe ref={frame} title="Console" src={route} onLoad={() => dress(frame.current, theme, accent)} style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }} className="absolute top-0 left-0 border-0" />
          ) : null}
        </div>
      </div>
      <p className="t-caption mt-3 text-center">1440 × 900, scaled to fit. Scroll inside the frame.</p>
    </div>
  );
}

function PhoneFrame({ route, theme, accent }: { route: string; theme: 'dark' | 'light'; accent: Accent }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => dress(frame.current, theme, accent), [theme, accent]);
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-[46px] border border-line-strong bg-surface-sunk p-2.5 shadow-overlay">
        <div className="relative overflow-hidden rounded-[38px]">
          <iframe ref={frame} title="Phone" src={route} onLoad={() => dress(frame.current, theme, accent)} className="block h-[760px] w-[390px] max-w-[calc(100vw-80px)] border-0" />
        </div>
      </div>
      <p className="t-caption mt-3">390 × 760: the drawer replaces the rail, rows stack.</p>
    </div>
  );
}

/* ── The host simulator ────────────────────────────────────────────────────────────────────────────── */

/** The host's own style variables: a neutral chat client, not any real product. Meridian maps them onto its roles. */
const HOST_STYLES = {
  dark: { '--color-background-primary': '#1C1C20', '--color-background-secondary': '#16161A', '--color-text-primary': '#F1F1F3', '--color-text-secondary': '#B4B4BC', '--color-text-tertiary': '#8E8E98', '--color-border-primary': 'rgba(255,255,255,0.09)', '--color-border-secondary': 'rgba(255,255,255,0.16)', '--border-radius-lg': '14px', '--border-radius-md': '10px' },
  light: { '--color-background-primary': '#FFFFFF', '--color-background-secondary': '#F5F5F7', '--color-text-primary': '#18181B', '--color-text-secondary': '#52525B', '--color-text-tertiary': '#6B6B74', '--color-border-primary': 'rgba(0,0,0,0.09)', '--color-border-secondary': 'rgba(0,0,0,0.16)', '--border-radius-lg': '14px', '--border-radius-md': '10px' },
};

type Turn = { from: 'person' | 'assistant'; text: string };

/**
 * A minimal MCP Apps host: it frames an embed route, answers ui/initialize with a host context, resizes the frame
 * on size-changed, honours request-display-mode, turns ui/message into a chat turn, and shows the model context the
 * view shares. Enough to see a Meridian view behave as a guest, without leaving the Atlas.
 */
export function HostSimulator({ route, theme }: { route: string; theme: 'dark' | 'light' }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<'inline' | 'fullscreen'>('inline');
  const [width, setWidth] = useState<'720' | '420'>('720');
  const [height, setHeight] = useState(420);
  const [context, setContext] = useState<string>('Nothing shared yet.');
  const [turns, setTurns] = useState<Turn[]>([]);
  const hostTheme = theme;

  const ctx = useCallback(() => ({
    theme: hostTheme,
    displayMode: mode,
    availableDisplayModes: ['inline', 'fullscreen'],
    containerDimensions: mode === 'inline' ? { maxHeight: 640, width: Number(width) } : { height: 760, width: 1120 },
    platform: 'web',
    locale: 'en-US',
    deviceCapabilities: { touch: false, hover: true },
    styles: { variables: HOST_STYLES[hostTheme] },
  }), [hostTheme, mode, width]);

  // Listen before the frame can load, or its ui/initialize arrives to nobody.
  useLayoutEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const m = e.data;
      if (!m || m.jsonrpc !== '2.0') return;
      const reply = (result: unknown) => frame.current?.contentWindow?.postMessage({ jsonrpc: '2.0', id: m.id, result }, '*');
      switch (m.method) {
        case 'ui/initialize': return reply({ protocolVersion: '2026-01-26', hostInfo: { name: 'Atlas host', version: '1' }, hostCapabilities: {}, hostContext: ctx() });
        case 'ui/notifications/size-changed': return setHeight(Math.min(1400, Math.max(120, Math.ceil(m.params.height))));
        case 'ui/request-display-mode': setMode(m.params.mode === 'fullscreen' ? 'fullscreen' : 'inline'); return reply({ mode: m.params.mode });
        case 'ui/message': setTurns((t) => [...t, { from: 'person', text: m.params?.content?.text ?? '' }, { from: 'assistant', text: 'Looking into it: the assistant would answer here, with the view as its context.' }]); return reply({});
        case 'ui/update-model-context': setContext(m.params?.content?.[0]?.text ?? JSON.stringify(m.params?.structuredContent)); return reply({});
        case 'ui/open-link': window.open(m.params.url, '_blank', 'noopener'); return reply({});
        case 'tools/call': setTimeout(() => reply({ content: [{ type: 'text', text: `${m.params?.name} applied` }] }), 700); return;
        default: if (m.id !== undefined) reply({});
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [ctx]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: ctx() }, '*');
  }, [ctx]);

  const bg = HOST_STYLES[hostTheme]['--color-background-secondary'];
  const ink = HOST_STYLES[hostTheme]['--color-text-primary'];
  const ink2 = HOST_STYLES[hostTheme]['--color-text-secondary'];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="overflow-hidden rounded-xl border border-line-strong shadow-overlay" style={{ background: bg, color: ink }}>
        <div className="flex items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: HOST_STYLES[hostTheme]['--color-border-primary'] }}>
          <span className="text-xs font-medium" style={{ color: ink2 }}>A chat client · MCP Apps host</span>
          <div className="ml-auto flex items-center gap-2">
            <Segmented size="sm" label="Display mode" value={mode} onChange={setMode} options={[{ value: 'inline', label: 'Inline' }, { value: 'fullscreen', label: 'Fullscreen' }]} />
            {mode === 'inline' ? <Segmented size="sm" label="Width" value={width} onChange={setWidth} options={[{ value: '720', label: '720' }, { value: '420', label: '420' }]} /> : null}
          </div>
        </div>
        <div className={cn('flex flex-col gap-4 p-5', mode === 'fullscreen' && 'p-0')}>
          {mode === 'inline' ? (
            <>
              <Bubble from="person" ink={ink} host={hostTheme}>How is the API doing this month?</Bubble>
              <p className="max-w-[60ch] text-sm leading-relaxed" style={{ color: ink2 }}>Here is {app.name}&rsquo;s overview for the last 30 days. Traffic is up; errors rose on two days in late September.</p>
            </>
          ) : null}
          <div className={cn(mode === 'inline' && 'mx-auto w-full')} style={mode === 'inline' ? { maxWidth: Number(width) } : undefined}>
            <iframe
              ref={frame}
              title="MCP App view"
              src={route}
              style={{ height: mode === 'fullscreen' ? 760 : height }}
              className="block w-full border-0 bg-transparent transition-[height] duration-(--dur-enter)"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
          {mode === 'inline' ? turns.map((t, i) => <Bubble key={i} from={t.from} ink={ink} host={hostTheme}>{t.text}</Bubble>) : null}
        </div>
      </div>
      <aside className="flex flex-col gap-3 self-start rounded-lg border border-line bg-surface p-4">
        <p className="t-kicker">Model context</p>
        <p className="text-sm leading-relaxed text-ink-2">{context}</p>
        <p className="t-caption border-t border-line pt-3">What the view tells the model with <code className="font-mono">ui/update-model-context</code>. Point at a day in the chart and watch it change; press Ask on a card to post a question.</p>
      </aside>
    </div>
  );
}

function Bubble({ from, ink, host, children }: { from: 'person' | 'assistant'; ink: string; host: 'dark' | 'light'; children: React.ReactNode }) {
  if (from === 'assistant') return <p className="flex gap-2 text-sm leading-relaxed" style={{ color: ink }}><Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" />{children}</p>;
  return <p className="ml-auto max-w-[75%] rounded-xl px-4 py-2.5 text-sm" style={{ background: host === 'dark' ? '#2A2A30' : '#EDEDF0', color: ink }}>{children}</p>;
}

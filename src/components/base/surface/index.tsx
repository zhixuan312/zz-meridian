'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { app } from '@/app.config';
import { HostBridge, type DisplayMode, type HostContext } from '@/lib/host';

/**
 * Which surface a view is on, and what it may ask of its host. Components read `useSurface()` and never touch the
 * bridge: on the console every agent affordance is absent; in an MCP host they act through it.
 */
export type Surface = {
  kind: 'console' | 'embed';
  /** A host answered `ui/initialize`. An embed opened directly (in the Atlas, in a tab) is not connected. */
  connected: boolean;
  mode: DisplayMode;
  host: HostContext;
  /** Ask for fullscreen; when the host refuses, open the console instead. */
  expand: (consolePath: string) => void;
  /** Post a question into the conversation, as the person. Absent when no agent is listening. */
  ask?: (text: string) => void;
  /** Call one of the product's tools through the host (an approved proposal's apply). Absent when not connected. */
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Tell the model what is on screen. A no-op on the console. */
  share: (text: string, structured?: Record<string, unknown>) => void;
  openLink: (url: string) => void;
};

const CONSOLE: Surface = {
  kind: 'console',
  connected: false,
  mode: 'fullscreen',
  host: {},
  expand: (p) => { window.location.href = p; },
  share: () => {},
  openLink: (u) => { window.open(u, '_blank', 'noopener'); },
};

const Ctx = createContext<Surface>(CONSOLE);
export const useSurface = () => useContext(Ctx);

/**
 * Put a subtree on a given surface without a host: the Atlas's previews and the tests use it to show an embed in
 * inline or fullscreen mode, connected or not. Products never need it.
 */
export function SurfaceOverride({ surface, children }: { surface: Partial<Surface>; children: ReactNode }) {
  const base = useContext(Ctx);
  return <Ctx.Provider value={{ ...base, ...surface }}>{children}</Ctx.Provider>;
}

/** The embed surface: starts the host bridge, applies the host's theme and style variables, and reports its height. */
export function EmbedSurface({ children }: { children: ReactNode }) {
  const bridge = useRef<HostBridge | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HostContext>({});
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<DisplayMode>('inline');

  useEffect(() => {
    const d = document.documentElement;
    d.setAttribute('data-surface', 'embed');
    const sys = matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (t?: 'light' | 'dark') => d.setAttribute('data-theme', t ?? (sys.matches ? 'dark' : 'light'));
    applyTheme();
    if (!HostBridge.framed()) return () => d.removeAttribute('data-surface');
    const b = new HostBridge();
    bridge.current = b;
    const apply = (ctx: HostContext) => {
      setHost(ctx);
      applyTheme(ctx.theme);
      if (ctx.displayMode) setMode(ctx.displayMode);
      d.setAttribute('data-display-mode', ctx.displayMode ?? 'inline');
      if (ctx.platform) d.setAttribute('data-platform', ctx.platform);
      for (const [k, v] of Object.entries(ctx.styles?.variables ?? {})) if (k.startsWith('--') && v) d.style.setProperty(k, v);
      const s = ctx.safeAreaInsets;
      if (s) for (const side of ['top', 'right', 'bottom', 'left'] as const) d.style.setProperty(`--safe-${side}`, `${s[side]}px`);
    };
    const off = b.onContext(apply);
    b.initialize(app.name, '1.0.0').then(() => setConnected(true)).catch(() => setConnected(false));
    return () => { off(); d.removeAttribute('data-surface'); };
  }, []);

  /* Report the body's height whenever it changes: an inline view never scrolls inside the host. */
  useEffect(() => {
    const el = root.current;
    if (!el || !connected) return;
    const ro = new ResizeObserver(() => bridge.current?.sizeChanged(Math.ceil(el.scrollWidth), Math.ceil(el.scrollHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [connected]);

  const value = useMemo<Surface>(() => {
    const b = bridge.current;
    return {
      kind: 'embed',
      connected,
      mode,
      host,
      expand: (p) => {
        if (!b || !connected) return void window.open(p, '_blank', 'noopener');
        b.requestDisplayMode('fullscreen').then((r) => r.mode === 'fullscreen' ? setMode('fullscreen') : b.openLink(new URL(p, location.origin).href)).catch(() => b.openLink(new URL(p, location.origin).href));
      },
      ask: connected && b ? (text) => void b.message(text).catch(() => {}) : undefined,
      callTool: connected && b ? (name, args) => b.callTool(name, args) : undefined,
      share: (text, structured) => void (connected && b?.modelContext(text, structured).catch(() => {})),
      openLink: (u) => (b && connected ? void b.openLink(new URL(u, location.origin).href) : void window.open(u, '_blank', 'noopener')),
    };
  }, [connected, mode, host]);

  return (
    <Ctx.Provider value={value}>
      <div
        ref={root}
        data-mode={mode}
        className="pt-[var(--safe-top,0px)] pr-[var(--safe-right,0px)] pb-[var(--safe-bottom,0px)] pl-[var(--safe-left,0px)]"
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

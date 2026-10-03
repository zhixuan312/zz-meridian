# Surface

A surface is where a view is being read, the console or an MCP host, and what it may ask of its host; components read it through `useSurface()` and never touch the bridge.

Status: beta

## Anatomy

1. **`useSurface()`**: `kind` (`console` | `embed`), `connected`, `mode` (`inline` | `fullscreen` | `pip`), the host context, and four actions: `expand`, `ask` (absent when no agent listens), `share` and `openLink`.
2. **`EmbedSurface`**: wraps every route under `app/embed/`. It starts the host bridge, applies the host's theme (`data-theme`), style variables and safe-area insets, marks the root `data-surface="embed"`, and reports the body's height.
3. **`useShareView(text, facts)`**: keeps the model told what is on screen; re-sent when the text or facts change, 250ms after they settle.
4. **`SurfaceOverride`**: puts a subtree on a given surface without a host, for the Atlas and tests.

## The host bridge

| Method | When |
|---|---|
| `ui/initialize` | On mount: the host answers with its theme, display mode, size, safe area and style variables |
| `ui/notifications/size-changed` | Whenever the body's height changes: an inline view never scrolls |
| `ui/request-display-mode` | Expand: ask for fullscreen; the host may refuse |
| `ui/message` | Ask: post a question into the conversation, as the person |
| `ui/update-model-context` | Share: tell the model what is on screen |
| `ui/open-link` | Open in ZZ Meridian, and a refused Expand |
| `tools/call` | Act through a tool; a write returns a Proposal first |

Protocol: MCP Apps 2026-01-26. The bridge (`src/lib/host.ts`) has no dependency; a product that uses `@modelcontextprotocol/ext-apps` can swap it without touching a component.

## The token bridge

On `data-surface="embed"`, the light is off, `ground` and `frame` are transparent, and the neutral roles take the host's variables, falling back to Meridian's own value for the theme:

| Meridian | Host |
|---|---|
| `surface`, `surface-raised` | `--color-background-primary` |
| `surface-sunk` | `--color-background-secondary` |
| `ink`, `ink-2`, `ink-3` | `--color-text-primary`, `-secondary`, `-tertiary` |
| `line`, `line-strong` | `--color-border-primary`, `-secondary` |
| `radius-md`, `radius-lg` | `--border-radius-md`, `-lg` |
| `font-sans` | `--font-sans` |

Accent, status and chart colours never bridge: they carry meaning, and the accent is how a reader recognises whose card this is.

## States

| State | `kind` | `connected` | `ask` |
|---|---|---|---|
| Console | `console` | false | absent |
| Embed, in a host | `embed` | true | present |
| Embed, opened directly (the Atlas, a tab) | `embed` | false | absent; Expand and Open use new tabs |

## Surfaces

This card is the definition of the surfaces; see `docs/surfaces.md` for how every card behaves on each.

## Agents

The surface is how the agentic rules reach components: Legible (`share`), Handoff (`ask`), and the Proposal for Consent.

## Accessibility

- The host owns the frame's focus; inside, the view keeps its own focus order.
- When a host sends low-contrast colours, the host is responsible for them; Meridian's fallbacks are measured in both themes.

## Do and do not

- Do read `useSurface()` in a component that behaves differently in a host; never sniff `window.parent`.
- Do not send model context on every keystroke; `useShareView` settles first.

## Implementation

```tsx
import { useSurface } from '@/components/base/surface';
import { useShareView } from '@/components/base/use-share-view';

const { kind, ask } = useSurface();
useShareView('ZZ Meridian overview for the last 7 days: 612K requests, 0.82% errors.', { view: 'overview', period: '7d' });
```

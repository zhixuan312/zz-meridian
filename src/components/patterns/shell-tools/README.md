# Shell tools

The shell tools are the global controls in the top bar of every console page, search and commands (⌘K) and alerts, kept one press away while the page scrolls.

Status: beta

## Anatomy

1. **Search pill**: a 36px pill with a search icon, the word Search and a ⌘K key; it opens the Command palette.
2. **Alerts**: a 36px round button with a bell and, when something is new, an 8px `accent` dot ringed in `ground`.

## Composition

Kbd and Tooltip, placed by `AppShell` in `PageFrame`'s top bar through the `tools` prop. Both controls are glass: `surface` at 60% with `backdrop-blur-md`, a `line-strong` hairline and `shadow-control`.

## States

| State | Search pill | Alerts |
|---|---|---|
| Rest | text `ink-3` | icon `ink-2` |
| Hover | border `line-control` at 40%, text `ink-2` | icon `ink` |
| Pressed | `press`: 0.5px down, 98.5% | same |
| Focus | 2px `accent` outline | same |
| New alerts | — | the dot; the name says how many |

The top bar itself is clear at rest and turns to glass (`ground` at 72%, `backdrop-blur-xl`, a `line` hairline) once the page title scrolls out, over `dur-enter`.

## Surfaces

- **Console**: the pill shows "Search" and ⌘K.
- **Mobile**: under 640px the pill folds to its 36px icon; the key hint goes.
- **Embed**: absent.

## Agents

Not applicable.

## Accessibility

- The pill's name is its text; the alerts button is named with its count ("Alerts, 1 new").
- The dot is never the only signal: the name carries the count.

## Content

- The tooltip names the control and the count: "Alerts · 1 new".

## Do and do not

- Do keep the top bar to these global tools. Page actions live in the masthead.
- Do not add a third tool without removing one; the bar holds two at phone width.

## Implementation

```tsx
import { ShellTools } from '@/components/patterns/shell-tools';

<AppShell rail={<Rail />} tools={<ShellTools />}>{children}</AppShell>
```

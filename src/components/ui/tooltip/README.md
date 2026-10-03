# Tooltip

A tooltip gives a short explanation of a control or a figure under the pointer or on keyboard focus; it is the inverse of the page so it reads as a point of focus, and it never holds an action or the only copy of a fact.

Status: beta

## Anatomy

1. **Body**: `surface-inverse`, `radius-sm` 6px, padding 6px by 8px, `shadow-overlay`, at most 256px wide.
2. **Text**: `text-xs` 12px, `ink-inverse`, line height 1.375.

## Variants

| Variant | Use |
|---|---|
| Label | Names an icon-only control: "Copy request ID" |
| Explanation | One or two sentences on what a figure counts: "95 of every 100 requests finished faster than this." |

## Sizes

One size; it wraps at 256px. Offset 6px from its trigger; it flips side and stays 8px from the window's edge.

## States

| State | Spec |
|---|---|
| Closed | not rendered |
| Opening | after 300ms of hover, at once on keyboard focus; then 120ms between neighbouring triggers. Enters with `m-pop` over `dur-enter` |
| Open | as above |
| Closing | on pointer leave, blur, Escape or a press; fades over 120ms |

## Behaviour

- Hover and focus open it; Escape closes it. Touch shows it on long press only; on touch, put the explanation where it can be read (a Metric tile's hint is also its accessible name).
- It is never interactive: no links, no buttons inside.

## Surfaces

- **Console**: as specified.
- **Mobile**: rare; anything a person needs must also be on the page.
- **Embed**: the same, inside the frame. The host never draws it.

## Agents

Not applicable.

## Accessibility

- Contrast (light): `ink-inverse` on `surface-inverse` 17.4:1; both themes hold above 4.5:1.
- The trigger is described by the tooltip (`aria-describedby`); an icon-only trigger still needs its own `aria-label`.

## Content

A label in two to four words; an explanation in one sentence, ending with a full stop.

## Do and do not

- Do keep the definition of a metric visible too (as a hint line) when people need it to read the number.
- Do not put a link or an action in a tooltip; use a Popover or a Menu.
- Do not repeat the trigger's visible label.

## Implementation

```tsx
import { Tooltip } from '@/components/ui/tooltip';

<Tooltip content="Copy request ID"><IconButton aria-label="Copy request ID">…</IconButton></Tooltip>
```

Props: `content`, `side` (`top` | `right` | `bottom` | `left`), `className`. The app's Providers mount the shared Tooltip provider (300ms delay).

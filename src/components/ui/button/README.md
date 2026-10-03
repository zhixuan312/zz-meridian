# Button

A button starts one action; each view has at most one primary button, and every other action is secondary or ghost.

Status: beta

## Anatomy

1. **Container**: the hit area. Secondary has a 1px `line-strong` border and `shadow-control`; primary and danger have the lit edge `shadow-accent`.
2. **Icon** (optional): 16px (14px small, 18px large) before the label, `currentColor`.
3. **Label**: one to three words that say exactly what happens: "Create key", "Export", "Revoke key".
4. **Trailing icon** (optional): an arrow on actions that move forward; it slides 2px right on hover.

## Variants

| Variant | Use | Fill | Border | Label |
|---|---|---|---|---|
| Primary | The one main action of a view | `accent` | none, `shadow-accent` | `on-accent` |
| Secondary (default) | Any other action | `surface` | `line-strong`, `shadow-control` | `ink` |
| Ghost | A low-emphasis action beside another: Cancel, a toolbar action | transparent | none | `ink-2` |
| Danger | An action that destroys: Revoke, Delete | `critical-fill` | none, `shadow-accent` | `on-critical` |

## Sizes

| Size | Height | Padding | Label | Icon | Radius |
|---|---|---|---|---|---|
| sm | `control-sm` 30px (26 compact) | 10px | `text-sm` 13px | 14px | `radius-md` 8px |
| md (default) | `control-md` 36px (30 compact) | 14px | `text-sm` 13px | 16px | `radius-md` 8px |
| lg | `control-lg` 44px (36 compact) | 20px | `text-base` 14px | 18px | `radius-lg` 12px |

Label weight `weight-medium` 500 at every size; icon to label `space-1-5` 6px (sm) or `space-2` 8px. Labels never wrap and never truncate; a label that does not fit is shortened in the copy.

## States

| State | Primary | Secondary | Ghost | Danger |
|---|---|---|---|---|
| Rest | as above | as above | as above | as above |
| Hover | fill `accent-hover` | fill `surface-sunk`, border `line-control` at 40% | fill `fill-hover`, label `ink` | 5% darker |
| Pressed | scale 0.985, 0.5px down, over `dur-press` | same | same | same |
| Focus (keyboard) | 2px `accent` outline, 2px offset | same | same | same |
| Busy | a 14px spinner replaces the icon; the width holds; `aria-busy` | same | same | same |
| Disabled | 45% opacity, no shadow, no pointer events | same | same | same |

Colour, border and shadow change over `dur-hover` 160ms; the trailing arrow moves over `dur-hover` with `ease-out`. Under reduced motion nothing moves; colours change at once.

## Behaviour

- Runs its action on click, Enter or Space. As a link (`asChild` around an `<a>`), it navigates and keeps the look.
- A disabled button says why nearby in text; greying out is never the only explanation.
- Busy is for actions that take more than 300ms; it blocks repeat presses without moving the layout.

## Surfaces

- **Console**: as specified.
- **Mobile**: the main action of a sheet or a standalone screen is `lg` and `block`, so it is a 44px target across the width.
- **Embed**: the same sizes; a button calls a tool or posts a message through the host, never navigates the frame. Danger is not offered inline: the embed links to the console instead.

## Agents

Not applicable: a button is how a person acts. When an agent proposes an action, the person's Approve button lives in a Proposal.

## Accessibility

- Contrast (light, cobalt): `on-accent` on `accent` 5.6:1, on `accent-hover` 6.6:1; `on-critical` on `critical-fill` 6.4:1; secondary label 18.1:1. Every accent preset holds 4.5:1 in both themes (`pnpm contrast`).
- The default 36px meets the 24px minimum target; `lg` meets the 44px touch target.
- An icon-only action uses an Icon button with an `aria-label`, not Button.

## Content

- Verb first, sentence case: "Create key", "Export CSV", "Revoke key". Not "Submit", "OK" or "Click here".
- The same name through the flow: the button that says "Revoke key" leads to a toast that says "Key revoked".

## Do and do not

- Do keep one primary per view; make the second action secondary or ghost.
- Do put Cancel (ghost) before the primary, the primary last in reading order.
- Do not use danger for an action that can be undone; use secondary and offer Undo in the toast.
- Do not colour a button with a status hue to decorate it.

## Implementation

```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary" icon={<Plus />}>Create key</Button>
<Button asChild><Link href="/requests">View requests</Link></Button>
```

Props: `variant` (`primary` | `secondary` | `ghost` | `danger`), `size` (`sm` | `md` | `lg`), `icon`, `trailing`, `busy`, `block`, `asChild`, and every native button attribute.

# Appearance menu

The appearance menu lets a person choose the theme, the accent and the density, applies the choice at once, and keeps it on this device.

Status: beta

## Anatomy

1. **Trigger**: a 32px icon button (sliders icon) in the rail's account card.
2. **Theme**: a radio group: System, Dark, Light, each with its icon, the choice checked in `accent`.
3. **Accent**: four 20px swatches in 28px targets: indigo, cobalt, jade, graphite; the choice ringed in `ink`.
4. **Density**: a radio group: Comfortable, Compact.

## Composition

Menu (`surface-raised`, `radius-lg`, `shadow-overlay`, 240px), its labels and separators, reading and writing `usePreferences()`.

## States

| Part | Rest | Hover | Chosen | Focus |
|---|---|---|---|---|
| Trigger | `ink-3` | `fill-hover`, `ink` | open: `fill-active`, `ink` | 2px `accent` outline |
| Radio row | `ink` | `fill-hover` | check in `accent` | highlighted |
| Swatch | as is | — | 2px `ink` ring, 2px offset | 2px `accent` outline |

The menu floats in over `dur-enter`; the page re-themes at once (no transition on colour tokens, so nothing flashes half-changed).

## Behaviour

- A choice applies immediately: `data-theme`, `data-accent` and `data-density` on `<html>`, stored in `localStorage` as `zz-meridian.preferences`.
- A script in `<head>` applies the stored choice before the first paint, so a reload never flashes the other theme.
- System removes `data-theme`, so the operating system decides; dark is the default when it states nothing.

## Surfaces

- **Console** and **Mobile**: in the rail's account card (the drawer on phones); it opens upward.
- **Embed**: absent. The host decides the theme; the accent is the product's.

## Agents

Not applicable: appearance is the person's own choice.

## Accessibility

- The trigger is named "Appearance". Theme and density are menu radio groups; the swatches are a radiogroup named "Accent", each radio named by its preset.
- A swatch's ring, not its colour, marks the choice.

## Content

- Name presets by what they look like (Indigo, Cobalt, Jade, Graphite), never by a brand.

## Do and do not

- Do keep it to these three choices. Anything else belongs in Settings.
- Do not offer an accent a product's brand cannot carry; remove presets in `src/lib/preferences.ts` instead.

## Implementation

```tsx
import { AppearanceMenu } from '@/components/patterns/appearance-menu';

<AppearanceMenu />
```
